# Authoring content

Subjects, courses, units, lessons, concepts, questions, and options all
live in the database. Seed them with SQL migrations — one migration per
coherent batch of content.

## Hierarchy

```
subject   (physics / chemistry)
  └── course              (grade 12, academic year 2026/2027)
        └── unit          (chapter)
              └── lesson  (title + overview + objectives + body blocks)
                    └── concept   (one atomic learning goal + formula)
                          └── question  (prompt + 4 options, one correct)
```

## Lesson `body` blocks

`lessons.body` is a TEXT column holding a JSON array. These block types
render in the lesson viewer today:

```json
[
  {"type": "text",    "text": "..."},
  {"type": "formula", "tex": "V = I \\times R"},
  {"type": "note",    "text": "..."},
  {"type": "lab",     "lab": "ohm-law"}
]
```

Adding a new block type requires a matching renderer in the lesson
reader — stick to existing types unless you're prepared to extend both.

## Writing a new seed migration

```sql
-- migrations/0013_new_content.sql

-- 1. Register the source
INSERT INTO content_sources (id, title, academic_year, origin, status, notes) VALUES
 ('<uuid>','<title>','2026/2027','editorial','unverified','Needs teacher review');

-- 2. Add the unit under an existing course
INSERT INTO units (id, course_id, title_ar, summary_ar, sort_order, origin, source_id) VALUES
 ('<uuid>','<course_id>','<title>','<summary>', 3, 'editorial', '<source_id>');

-- 3. Add lessons (body is a JSON string)
INSERT INTO lessons (id, unit_id, title_ar, overview_ar, objectives_ar, body, sort_order, origin, source_id) VALUES
 ('<uuid>','<unit_id>','<title>','<overview>',
  '["هدف 1","هدف 2"]',
  '[{"type":"text","text":"..."},{"type":"formula","tex":"..."}]',
  1, 'editorial', '<source_id>');

-- 4. Concepts
INSERT INTO concepts (id, lesson_id, title_ar, explanation_ar, formula_tex, sort_order, origin) VALUES
 ('<uuid>','<lesson_id>','<title>','<explanation>','<formula>', 1, 'editorial');

-- 5. Questions + options (one row per option, one is_correct = 1)
INSERT INTO questions (id, concept_id, prompt_ar, explanation_ar, difficulty, origin) VALUES
 ('<uuid>','<concept_id>','<prompt>','<why>', 2, 'editorial');
INSERT INTO question_options (id, question_id, label_ar, is_correct, sort_order) VALUES
 ('<uuid1>','<question_id>','<option 1>', 0, 1),
 ('<uuid2>','<question_id>','<option 2>', 1, 2),
 ('<uuid3>','<question_id>','<option 3>', 0, 3),
 ('<uuid4>','<question_id>','<option 4>', 0, 4);
```

## Generating IDs

Any valid UUID string works. The physics seed uses hand-written lowercase
hex uuids. The chemistry seed uses `crypto.randomUUID()`-style output.
Both are fine — just be consistent inside one migration.

## Numeric answers

The exam builder and practice grader compare strings, so numeric
answers must match verbatim. Prefer decimal with the same precision as
the prompt (e.g. if the prompt uses `1.7×10⁻⁸`, options should use the
same notation), and double-check the maths before committing.

## Arabic conventions

- All natural-language content in Arabic.
- Subject name_en can stay English (shown in the subject-list subtitle).
- Formulas are stored as KaTeX strings (no leading `$`) and render LTR
  inside the RTL body thanks to `.katex { direction: ltr }`.
- `description_ar` can be short — the UI already shows a clear status
  badge if the source is unverified.

## Review before launch

Every seed migration inserts rows with `status = 'unverified'` and
`origin = 'editorial'`. A teacher or subject-matter reviewer should sign
off before flipping status to `verified` in a follow-up migration.
