# Planning Model

Writing OS supports two planning paths.

## 1. Import an Existing Plan

Use this path when the author already knows the series length, topics, and article order.

Recommended format: Markdown with one `##` heading per article.

```md
# My Writing Project

Audience: Independent creators and small teams.
Outcome: Readers can build a repeatable writing workflow.
Tone: Clear, practical, and thoughtful.

## Article 001 | Why this topic matters

Goal: Help readers understand the main promise of the series.
Reader level: Beginner.
Tree position: Foundation > Orientation.
Key points:
- Why the topic matters now
- What readers will be able to do after the series
- What this series will not cover
Constraints:
- Avoid jargon without explanation
Next hook: The next article defines the core workflow.

## Article 002 | The core workflow

Goal: Explain the workflow readers will use throughout the series.
Reader level: Beginner.
Tree position: Foundation > Workflow.
Key points:
- Inputs
- Process
- Outputs
- Feedback loop
Next hook: Apply the workflow to the first concrete example.
```

Minimum required fields:

- Article number
- Title
- Goal or brief

Recommended fields:

- Audience
- Reader level
- Tree position
- Key points
- Constraints
- Next hook

The importer should also accept rough outlines. If the input is messy, the Planning Agent can normalize it into this schema before writing begins.

### Format Policy

Existing-plan users should have a recommended format, but the product should not reject their work just because their outline is imperfect.

Use two import modes:

- **Structured import**: best for users who can follow the template. This mode reads article numbers, titles, goals, reader levels, tree positions, key points, constraints, and next hooks directly.
- **Loose import**: best for users who already have notes, spreadsheets, or rough outlines. This mode preserves the original text, then asks the Planning Agent to convert it into the normalized article schema.

The minimum reliable Markdown format is:

```md
## Article 001 | Article title

Goal: What this article should help the reader understand or do.
Key points:
- First idea
- Second idea
- Third idea
```

The parser may also accept these heading variants:

- `## Article 001 | Title`
- `## Post 001 - Title`
- `## Chapter 001: Title`
- `## 001 | Title`
- `## 001. Title`

If the article number or title cannot be identified, the input should be sent to the Planning Agent instead of being silently guessed.

## 2. Generate a Plan with Guidance

Use this path when the author does not know how many articles to write or what each article should cover.

The Planning Agent should ask for:

- Topic or domain
- Target reader
- Reader starting level
- Desired outcome
- Publishing channel
- Desired depth
- Approximate series length, or permission for the system to recommend one
- Examples of preferred writing style, if any

Then it creates:

- Series title
- Audience definition
- Learning or persuasion path
- Phases
- Article list
- Knowledge map
- Milestones
- Article-level briefs

## Normalized Article Schema

```json
{
  "num": 1,
  "title": "Why this topic matters",
  "full_title": "Article 001 | Why this topic matters",
  "goal": "Help readers understand the main promise of the series.",
  "audience": "Independent creators and small teams.",
  "reader_level": "Beginner",
  "tree_position": {
    "path": "Foundation > Orientation",
    "layer_role": "Set the map for the series.",
    "parent": "Foundation",
    "children": "Workflow, examples, implementation"
  },
  "key_points": [
    "Why the topic matters now",
    "What readers will be able to do",
    "What this series will not cover"
  ],
  "constraints": [
    "Avoid jargon without explanation"
  ],
  "next_hook": "The next article defines the core workflow.",
  "outline": "Original imported or generated plan text."
}
```
