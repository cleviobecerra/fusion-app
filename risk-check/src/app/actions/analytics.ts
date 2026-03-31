'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function getFilterOptions(businessUnit?: string, year?: string, month?: string) {
    const session = await getSession()
    const userId = session?.userId
    const userRole = session?.role?.toUpperCase()

    if (!userId) return { businessUnits: [], subAreas: [], years: [], months: [], days: [] }

    const whereReq = userRole === 'SOLICITANTE' ? { solicitanteId: userId } : {}

    // Fetch dates from TestResult (source of truth for analytics)
    const results = await prisma.testResult.findMany({
        where: {
            worker: {
                testRequest: whereReq
            }
        },
        select: {
            worker: {
                select: {
                    testRequest: {
                        select: { scheduledFor: true }
                    }
                }
            }
        }
    })

    const yearsSet = new Set<string>()
    const monthsSet = new Set<string>()
    const daysSet = new Set<string>()

    results.forEach((res: any) => {
        const d = new Date(res.worker.testRequest.scheduledFor)
        const reqYear = d.getFullYear().toString()
        const reqMonth = (d.getMonth() + 1).toString()
        const reqDay = d.getDate().toString()

        yearsSet.add(reqYear)

        if (year && reqYear === year) {
            monthsSet.add(reqMonth)

            if (month && reqMonth === month) {
                daysSet.add(reqDay)
            }
        } else if (!year) {
            monthsSet.add(reqMonth)
        }
    })

    // Fetch distinct Business Units
    const units = await prisma.worker.findMany({
        where: { testRequest: whereReq },
        select: { businessUnit: true },
        distinct: ['businessUnit']
    })

    // Fetch distinct SubAreas
    const subAreaWhere: any = { testRequest: whereReq }
    if (businessUnit && businessUnit !== 'all') {
        subAreaWhere.businessUnit = businessUnit
    }

    const areas = await prisma.worker.findMany({
        where: subAreaWhere,
        select: { subArea: true },
        distinct: ['subArea']
    })

    // Sort Years, Months and Days
    const years = Array.from(yearsSet).sort()
    const months = Array.from(monthsSet).map(Number).sort((a, b) => a - b).map(String)
    const days = Array.from(daysSet).map(Number).sort((a, b) => a - b).map(String)

    return {
        businessUnits: units.map((u: any) => u.businessUnit).filter(Boolean),
        subAreas: areas.map((a: any) => a.subArea).filter(Boolean),
        years,
        months,
        days
    }
}

interface AnalyticsFilters {
    year?: string
    month?: string
    day?: string
    businessUnit?: string
    subArea?: string
}

export async function getAnalyticsData(filters?: AnalyticsFilters) {
    const session = await getSession()
    const userId = session?.userId
    const userRole = session?.role

    if (!userId) return null

    // Initialize worker query object
    const workerQuery: any = {
        testRequest: {}
    }

    // Role-based security filter
    if (userRole?.toUpperCase() === 'SOLICITANTE') {
        workerQuery.testRequest.solicitanteId = userId
    }

    // Apply Year/Month Filters
    if (filters?.year) {
        const year = parseInt(filters.year)
        // Construct date range for the Year
        let startDate = new Date(year, 0, 1)
        let endDate = new Date(year, 11, 31, 23, 59, 59)

        if (filters.month) {
            const month = parseInt(filters.month)

            if (filters.day) {
                const day = parseInt(filters.day)
                startDate = new Date(year, month - 1, day, 0, 0, 0)
                endDate = new Date(year, month - 1, day, 23, 59, 59)
            } else {
                startDate = new Date(year, month - 1, 1)
                endDate = new Date(year, month, 0, 23, 59, 59) // Last day of month
            }
        }

        workerQuery.testRequest.scheduledFor = {
            gte: startDate,
            lte: endDate
        }
    }

    // Apply Worker Attribute Filters
    if (filters?.businessUnit && filters.businessUnit !== 'all') {
        workerQuery.businessUnit = filters.businessUnit
    }

    if (filters?.subArea && filters.subArea !== 'all') {
        workerQuery.subArea = filters.subArea
    }

    // Compose final where clause for TestResult
    const whereClause = {
        worker: workerQuery
    }

    console.log('Fetching analytics with where:', JSON.stringify(whereClause, null, 2))

    // ... (previous code)

    // Execute queries in parallel
    const [totalProcessed, trendsRaw, resultsForStats, detailedResultsRaw] = await Promise.all([
        // 1. Total count
        prisma.testResult.count({ where: whereClause }),

        // 2. Trends (Needs date)
        prisma.testResult.findMany({
            where: { ...whereClause, isHistorical: false },
            select: { status: true, worker: { select: { testRequest: { select: { scheduledFor: true } } } } }
        }),

        // 3. Business Unit Stats & Pass Rate (Needs unit + status)
        prisma.testResult.findMany({
            where: { ...whereClause, isHistorical: false },
            select: { status: true, worker: { select: { businessUnit: true } } }
        }),

        // 4. Detailed Results (Limited to latest 100 for UI performance)
        prisma.testResult.findMany({
            where: { ...whereClause, isHistorical: false },
            include: {
                worker: {
                    select: {
                        name: true,
                        rut: true,
                        businessUnit: true,
                        subArea: true,
                        testRequest: {
                            select: { scheduledFor: true }
                        }
                    }
                }
            },
            orderBy: {
                worker: {
                    testRequest: { scheduledFor: 'desc' } // Newest first
                }
            },
            take: 100 // Limit for UI rendering
        })
    ])

    // Calculate Counts from resultsForStats (since it has all non-historical rows)
    const realTestsCount = resultsForStats.length
    const historicalCount = totalProcessed - realTestsCount // Approximate if we assume total = real + historical
    // Wait, totalProcessed is count(*). realTestsCount is count(* where !isHistorical).
    // So historical = total - real. Correct.

    const passed = resultsForStats.filter((r: any) => r.status === 'SAFE').length
    const failed = resultsForStats.filter((r: any) => r.status === 'UNSAFE').length
    const neutral = resultsForStats.filter((r: any) => r.status === 'NEUTRAL').length

    // Status Distribution
    const statusDistribution = [
        { name: 'Seguro', value: passed, fill: '#22c55e' },
        { name: 'Inseguro', value: failed, fill: '#ef4444' },
        { name: 'Neutro', value: neutral, fill: '#eab308' },
    ].filter((i: any) => i.value > 0)

    // Monthly Trends
    const trendsMap = new Map<string, { date: string, total: number, safe: number, unsafe: number, neutral: number }>()

    trendsRaw.forEach((res: any) => {
        const date = new Date(res.worker.testRequest.scheduledFor)
        const key = `${date.getMonth() + 1}/${date.getFullYear()}`
        if (!trendsMap.has(key)) {
            trendsMap.set(key, { date: key, total: 0, safe: 0, unsafe: 0, neutral: 0 })
        }
        const entry = trendsMap.get(key)!
        entry.total++
        if (res.status === 'SAFE') entry.safe++
        if (res.status === 'UNSAFE') entry.unsafe++
        if (res.status === 'NEUTRAL') entry.neutral++
    })

    const trends = Array.from(trendsMap.values())
        .sort((a, b) => {
            const [mA, yA] = a.date.split('/').map(Number)
            const [mB, yB] = b.date.split('/').map(Number)
            return yA - yB || mA - mB
        })

    // Business Unit Stats
    const buStatsMap = new Map<string, { unit: string, safe: number, neutral: number, unsafe: number, total: number }>()

    resultsForStats.forEach((res: any) => {
        const unit = res.worker.businessUnit || 'Sin Unidad'
        if (!buStatsMap.has(unit)) {
            buStatsMap.set(unit, { unit, safe: 0, neutral: 0, unsafe: 0, total: 0 })
        }
        const entry = buStatsMap.get(unit)!
        entry.total++
        if (res.status === 'SAFE') entry.safe++
        if (res.status === 'NEUTRAL') entry.neutral++
        if (res.status === 'UNSAFE') entry.unsafe++
    })

    const businessUnitStats = Array.from(buStatsMap.values()).sort((a, b) => b.total - a.total)

    // Detailed Results (Mapped from Limited Fetch)
    const detailedResults = detailedResultsRaw.map((r: any) => ({
        id: r.id,
        date: r.worker.testRequest.scheduledFor,
        workerName: r.worker.name || 'Sin Nombre',
        workerRut: r.worker.rut,
        businessUnit: r.worker.businessUnit,
        subArea: r.worker.subArea,
        status: r.status
    }))

    return {
        totalProcessed,
        realTestsCount,
        historicalCount,
        passRate: realTestsCount > 0 ? Math.round((passed / realTestsCount) * 100) : 0,
        statusDistribution,
        trends,
        businessUnitStats,
        detailedResults
    }
}

export async function getExportData(filters?: AnalyticsFilters) {
    const session = await getSession()
    const userId = session?.userId
    const userRole = session?.role

    if (!userId) return null

    const workerQuery: any = { testRequest: {} }
    if (userRole?.toUpperCase() === 'SOLICITANTE') {
        workerQuery.testRequest.solicitanteId = userId
    }

    if (filters?.year) {
        const year = parseInt(filters.year)
        let startDate = new Date(year, 0, 1)
        let endDate = new Date(year, 11, 31, 23, 59, 59)

        if (filters.month) {
            const month = parseInt(filters.month)
            if (filters.day) {
                const day = parseInt(filters.day)
                startDate = new Date(year, month - 1, day, 0, 0, 0)
                endDate = new Date(year, month - 1, day, 23, 59, 59)
            } else {
                startDate = new Date(year, month - 1, 1)
                endDate = new Date(year, month, 0, 23, 59, 59)
            }
        }
        workerQuery.testRequest.scheduledFor = { gte: startDate, lte: endDate }
    }

    if (filters?.businessUnit && filters.businessUnit !== 'all') {
        workerQuery.businessUnit = filters.businessUnit
    }

    if (filters?.subArea && filters.subArea !== 'all') {
        workerQuery.subArea = filters.subArea
    }

    const whereClause = { worker: workerQuery }

    const results = await prisma.testResult.findMany({
        where: { ...whereClause, isHistorical: false }, // Exports usually want real data? Or all? Let's assume real for now as per previous logic.
        include: {
            worker: {
                select: {
                    name: true,
                    rut: true,
                    businessUnit: true,
                    subArea: true,
                    testRequest: { select: { scheduledFor: true } }
                }
            }
        },
        orderBy: { worker: { testRequest: { scheduledFor: 'asc' } } }
    })

    return results.map((r: any) => ({
        id: r.id,
        date: r.worker.testRequest.scheduledFor,
        workerName: r.worker.name || 'Sin Nombre',
        workerRut: r.worker.rut,
        businessUnit: r.worker.businessUnit,
        subArea: r.worker.subArea,
        status: r.status
    }))
}
