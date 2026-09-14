# One persistent embedded YouTube player

Standards mounts one root-level `GlobalPlayer` that owns the active playable
source, progress, and video visibility across browse navigation. Its visible
transport state must derive from confirmed YouTube IFrame events. YouTube is the
only embedded playback source; other services remain Recording link-out
destinations under ADR-0004. The player must not promise background playback or
use unofficial extractable media URLs, because the browser and YouTube IFrame
API cannot provide that contract.

The IFrame host remains mounted with a stable size class because the YouTube
API copies the target's classes only when it creates the IFrame. Visibility and
responsive resizing therefore belong on the host's parent. When video is
hidden, that parent keeps the player normal-sized and positions it off-screen;
shrinking the embedded player to a negligible box can trigger browser
auto-pause behavior.
