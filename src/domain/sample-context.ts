import { z } from 'zod'

export const goldenPathSchema = z.object({
  stage: z.literal('P4'),
  classSize: z.literal(24),
  durationMinutes: z.literal(45),
  subject: z.literal('Literacy and storytelling'),
  learningFocus: z.literal('Debugging'),
  support: z.tuple([z.literal('Reduced reading load'), z.literal('Visual instructions')]),
  extension: z.literal('Loop challenge'),
  resources: z.object({
    robots: z.literal(3),
    tileSets: z.literal(9),
    activityMats: z.literal(3),
    instructionCardPacks: z.literal(3),
  }),
})

export const goldenPath = goldenPathSchema.parse({
  stage: 'P4',
  classSize: 24,
  durationMinutes: 45,
  subject: 'Literacy and storytelling',
  learningFocus: 'Debugging',
  support: ['Reduced reading load', 'Visual instructions'],
  extension: 'Loop challenge',
  resources: {
    robots: 3,
    tileSets: 9,
    activityMats: 3,
    instructionCardPacks: 3,
  },
})
