# MirOCR
Entry for Miro-thon 2026.

Sometimes our ideas just seem to flow better when using physical paper or sticky notes, or maybe the internet is too slow and you can't even use digital tools in the first place. Whatever the reason maybe, its very to painful to have to manually digitize it. You’re left dragging boxes and re-typing text instead of actually building. This project aims bridges that gap, turning rough sketches into a Miro board in seconds.

- A Vision Language Model (VLM) analyzes a picture of your handwritten diagram to identify specific architectural components like load balancers, databases, and microservices.

- Then, using the Miro API, it creates a board and automatically places aligned digital shapes/connectors based on the physical drawing/board.

- The VLM additionally acts as a "suggester" too by attaching sticky notes to your board with best-practice advice tailored to the specific technologies it recognized if applicable.

