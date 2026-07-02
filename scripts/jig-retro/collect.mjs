// jig-retro collect — stub module. Real implementations land in later phases (P1/P2).
// Named exports must stay stable so downstream tests can import them cleanly.

export function normalize(s) { throw new Error('not implemented') }

export function parseRetro(text) { throw new Error('not implemented') }

export function fingerprint(area, change) { throw new Error('not implemented') }

export function dedupe(findings, seen) { throw new Error('not implemented') }

export function renderDigest(seen) { throw new Error('not implemented') }
