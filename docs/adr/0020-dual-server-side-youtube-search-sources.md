# Dual server-side YouTube search sources

Add Recording uses a catalog-oriented server-only YouTube Music adapter and
the official server-side YouTube Data API as a separate fallback. Their results
normalize to the shared YouTube video ID, accumulate discovery provenance, and
classify source evidence as `song` when a YouTube Music song result or
Topic-channel evidence exists and `video` otherwise. Credentials and provider
transport never enter the browser bundle.

The normalized source category is evidence, not Recording Kind: `song` strongly
supports `released`, while `video` remains overrideably ambiguous between an
official music video and a `video_capture`. The provider snapshot remains a
YouTube Item attached to a provider-neutral Recording under ADR-0008.
