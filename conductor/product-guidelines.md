# Mediarr Product Guidelines

**Visual Identity:**
- **Primary Aesthetic:** Modern Dark. A sleek, high-contrast dark mode with neon accents, optimized for home theater and media management environments.
- **Typography:** Modern sans-serif fonts focused on readability in dark environments.
- **Color Palette:** Deep blacks and grays for the background, with vibrant neon accents (e.g., cyan, purple, or electric green) for active states and calls to action.

**User Experience (UX):**
- **Tone and Style:** Professional & Technical. Use precise, industry-standard terminology (e.g., "Indexer Request," "RSS Sync," "Transcode Profile") to provide clarity for technical users.
- **Information Density:** High. Prioritize data visibility and quick access to technical details.
- **Configuration Strategy:** Power-User First. Show all settings by default. Assume users are technically proficient and want immediate access to fine-grained controls without navigating through "Advanced" toggles.
- **Convention over Configuration:** Prioritize sensible, hardcoded defaults within the Docker container.
    - **Paths:** Use `/config` for application state and `/data` for all media operations (downloads and library).
    - **Optimization:** Enforce the use of a unified `/data` volume to ensure hard links and atomic moves work out-of-the-box for home lab users.
    - **Simplicity:** Users should manage complexity through host-side volume mapping rather than extensive internal configuration.

**Communication Style:**
- **System Feedback:** Detailed and technical error messages that aid in troubleshooting.
- **Labels:** Concise and descriptive, using standard media automation nomenclature.
