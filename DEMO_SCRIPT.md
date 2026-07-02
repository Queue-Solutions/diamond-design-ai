# Diamond Design AI Agent Demo Script

## 3-Minute Demo

1. Open the landing page and frame the product:
   "This is a luxury AI design workspace for diamond jewelry discovery, visualization, iteration, and workshop handoff."
2. Click `Start Designing`.
3. Use this prompt:
   "I want a modern engagement ring for my partner, with an oval diamond, white gold, a hidden halo, and a refined thin band."
4. Show the live design profile and readiness status.
5. Generate one concept.
6. Select one concept, edit it with:
   "Change to rose gold and make it more minimal."
7. Finalize the preferred concept.
8. Show the workshop brief, PDF/PNG export, copy summary, and print actions.

## 7-Minute Demo

1. Start from the landing page and explain the two journeys: create from scratch or upload an existing design.
2. Run the create-from-scratch scenario.
3. Highlight the three-column workspace:
   - AI conversation
   - primary canvas
   - live profile, timeline, and handoff panel
4. Generate concepts and compare two versions.
5. Edit a concept and show the version timeline.
6. Finalize a design and generate the brief.
7. Return to landing, choose `Upload Existing Design`, upload a reference, and edit it.
8. Explain that original references remain preserved as V1.
9. End on the workshop handoff card and export options.

## Create-From-Scratch Scenario

Suggested opening prompt:

```text
I want a modern engagement ring for my partner, with an oval diamond, white gold, a hidden halo, and a refined thin band.
```

Suggested edits:

```text
Make it more minimal.
Change to rose gold.
Increase the center stone slightly.
```

## Upload-Existing-Design Scenario

1. Click `Upload Existing Design`.
2. Upload a PNG/JPG/JPEG/WEBP diamond jewelry image under 10MB.
3. Confirm upload.
4. Use:

```text
Make the band thinner and remove the halo.
```

## If Asked About CAD, 3D, or Manufacturing

"This MVP intentionally stops at visual concepting and workshop handoff. It does not create CAD, 3D, technical drawings, or manufacturing files. The goal is to help the customer and jeweler align on visual direction before a professional jeweler handles engineering and production decisions."

## If Asked About Website Integration

"This is currently a standalone premium demo. The architecture is ready to be integrated into a diamond store website later, but this phase keeps the experience isolated so the retailer can evaluate the workflow and brand fit first."

## If Asked About Pricing

"Pricing is outside this MVP. The current demo focuses on customer experience, design iteration, and handoff quality. Pricing can be introduced later based on store inventory, stone availability, metal selection, labor, and workshop rules."

## Demo Safety Notes

- If APIs are unavailable, enable `NEXT_PUBLIC_DEMO_MODE=true` before the demo.
- Demo mode uses clearly labeled placeholder concepts and does not silently fake real provider success.
- Keep `.env.local` configured with real keys for the full live flow.
