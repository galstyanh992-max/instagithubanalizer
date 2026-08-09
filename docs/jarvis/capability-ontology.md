# Capability Ontology

Capabilities use lowercase dotted identifiers such as `web.search`, `web.crawl.bulk`, `browser.interaction`, `document.parse.pdf`, `filesystem.read`, `automation.workflow`, `social.draft` and `video.render`.

Aliases are normalized before matching. A generic capability describes what can be done; a physical capability record describes one implementation. Parent/child dotted identifiers can match when the implementation supplies the required specialization.

Repository patterns, products and orchestration frameworks are not capabilities by themselves. They become implementations only after verification, adaptation, tests and registration.
