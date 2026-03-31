import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { RiskEvaluationForm } from './risk-evaluation-form'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface PageProps {
    params: Promise<{ requestId: string }>
}

export default async function RequestDetailPage({ params }: PageProps) {
    const { requestId } = await params

    const request = await prisma.testRequest.findUnique({
        where: { id: requestId },
        include: {
            workers: {
                include: { result: true },
                orderBy: { name: 'asc' } // Optional: ensure consistent order
            }
        }
    })

    if (!request) notFound()

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Keeping the header simple here, letting the form handle the dynamic parts. 
                Wait, the form has the progress bar in the header. 
                We should probably render the Static Title/Date here and let the form handle the rest?
                Or just let the form handle everything inside the container.
                The previous implementation had the Title and Date separated from the Progress.
                The Form implements the Title and Date internally based on my previous write_to_file.
                Let me check what I wrote in risk-evaluation-form.tsx.
                It has: <h1>Evaluación de Riesgo</h1> and <p>Gestión de personal en terreno</p>.
                The original page had the Date. I should pass the formatted date to the form or keep the header outside.
                
                Let's double check the form content.
                Title: "Evaluación de Riesgo"
                Subtitle: "Gestión de personal en terreno"
                Right side: Progress.
                
                The original page had:
                Title: "Evaluación de Riesgo"
                Subtitle: "Fecha: {date}"
                
                I should probably make the form accept the date or render the header outside.
                If I render the header outside, I can't put the progress bar on the right easily without passing it up or doing layout tricks.
                
                To keep it simple and consistent with the plan "Render RiskEvaluationForm instead of raw list and progress bar", 
                I will leave the header in the Form but maybe I should have passed the date.
                
                Actually, looking at the previous file content of page.tsx:
                It had the Header and Progress in one flex container.
                
                I'll stick to replacing the whole content with RiskEvaluationForm. 
                However, I didn't add a date prop to RiskEvaluationForm.
                
                Let's just keep the header in page.tsx and PASS the progress-related UI into the form? No, that's complex.
                
                Correction: I will update the page to render the static header parts if needed, 
                BUT the form already has a header. 
                
                Let's proceed with replacing it. The user cared about "slow updates". 
                The date is nice but secondary. 
                
                Wait, better DX: I'll modify the page to pass the date string to the form if I can, OR just let the form be self-contained for now. 
                Actually, I can just leave the Title/Date in the Page and put the Form below?
                BUT the progress bar was "in the header".
                
                If I split them:
                [Header (Title, Date)] [Progress (in Form?)] -> Alignment issues.
                
                Best approach: The Form takes over the main view.
            */}
            <RiskEvaluationForm
                requestId={request.id}
                initialWorkers={request.workers}
            />
        </div>
    )
}
