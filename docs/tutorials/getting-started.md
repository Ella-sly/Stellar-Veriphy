# Getting Started Tutorial Transcript

Length target: 5-10 minutes

## Outline

1. Introduce StellarVeriphy and what the app is for.
2. Show the current homepage.
3. Open the upload flow and explain what exists today.
4. Show the health endpoint briefly.
5. Explain where to find the docs and next steps.

## Transcript

Hello, and welcome to StellarVeriphy.

In this short walkthrough, I’ll show you how to get oriented in the project and
find the pieces that are already available today.

Start on the homepage. The product is a verification and provenance platform
built on Stellar. At a high level, it records proof that a piece of media was
verified by a trusted process and can later be looked up on-chain.

Next, open the creator upload flow. This repo currently has the page scaffold in
place, which gives us the shape of the experience even before the full upload
logic is wired in.

To confirm the app is running, visit the health endpoint at `/api/health`.
That route returns a simple `ok` response and is the quickest way to check the
Next.js API layer.

If you want the full setup path, use the developer onboarding guide in the docs.
If you want the product workflow, use the user guide and the contract reference
to understand how the verification system is designed end-to-end.

That’s the short tour. The next tutorial covers the actual verification flow.

