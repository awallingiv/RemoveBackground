/**
 * HQ Export API Endpoint (Stub)
 *
 * This is a placeholder endpoint for future server-side HQ processing.
 * In the future, this would:
 * 1. Accept an image upload
 * 2. Run high-quality segmentation on the server (GPU)
 * 3. Return the processed image at full resolution
 *
 * For now, it returns a 501 Not Implemented response.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Not Implemented',
      message: 'HQ export mode is coming soon. This feature will allow server-side processing at full resolution.',
      roadmap: {
        features: [
          'Full resolution processing (no downscaling)',
          'Advanced edge refinement',
          'Batch processing',
          'API access for developers',
        ],
        estimatedAvailability: 'TBD',
      },
    },
    { status: 501 }
  );
}

export async function GET() {
  return NextResponse.json({
    name: 'HQ Export API',
    status: 'coming_soon',
    description: 'Server-side high-quality background removal processing.',
    currentAlternative: 'Use the client-side processing available on the main page.',
  });
}
