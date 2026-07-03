import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { manualReviewResolveSchema } from '@/lib/validators'

export async function POST(req: Request) {
  try {
    const body = manualReviewResolveSchema.parse(await req.json())
    const updated = await db.extractedCandidate.update({
      where: { id: body.candidateId },
      data: {
        owner: body.owner,
        repo: body.repo,
        resolvedGithubUrl: `https://github.com/${body.owner}/${body.repo}`,
        candidateName: `${body.owner}/${body.repo}`,
        resolvedBy: 'manual',
        status: 'resolved',
        needsManualReview: false,
      },
    })
    return NextResponse.json({ candidate: updated })
  } catch (err) {
    console.error('[candidates.resolve] error', err)
    return NextResponse.json({ error: 'Resolve failed' }, { status: 500 })
  }
}
