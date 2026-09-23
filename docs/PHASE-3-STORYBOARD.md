# Phase 3 camera storyboard - defined before camera implementation

Coordinates below use glTF / Three.js Y-up metres. Blender Z-up geometry is converted by its exporter. The existing photographic hero, discovery form, collection and five-chapter story remain intact.

| Progress | Camera / purpose             | Position    | Look target | FOV | Copy                                       | Interaction                                 |
| -------- | ---------------------------- | ----------- | ----------- | --- | ------------------------------------------ | ------------------------------------------- |
| 0.00     | Arrival / establish          | 122,111,158 | -23,45,0    | 42  | A new perspective on extraordinary living. | Architectural still bridge                  |
| 0.18     | Approach / presence          | 93,79,131   | -17,43,0    | 40  | A quieter kind of landmark.                | Project metadata                            |
| 0.36     | Architecture / lateral track | 54,70,125   | -13,47,0    | 38  | Designed with intention.                   | Sky terrace                                 |
| 0.57     | Residences / elevation       | 54,87,106   | -13,65,0    | 37  | A world above the everyday.                | Level 18 / Level 22, residence hotspot      |
| 0.77     | Lifestyle / podium           | 79,40,88    | -13,15,4    | 41  | The everyday, elevated.                    | Private club / landscaped court             |
| 1.00     | Exit / collection reframe    | 122,111,158 | -23,45,0    | 42  | Find your own perspective.                 | Existing Banyan House photo takes ownership |

Between checkpoints, smoothstep interpolation provides a deliberate pause at each composition and symmetric reverse scrolling. One GSAP-smoothed normalized value drives camera, HTML chapter state, lights, floor visibility, architectural markers and the entry/exit masks. Pointer depth is a bounded additive desktop offset, never a second camera timeline.

The exit image uses the existing first collection image and compresses into the same editorial width; discovery remains in its existing position directly before the collection. Mobile uses a shorter native sticky sequence with centred framing; reduced motion and unsuitable devices retain an architectural still plus accessible information.
