# How Prompts Influence Results and How to Improve Them

## 1. Why the Prompt Matters So Much

A language model does not "know what you mean." It predicts the most useful continuation of the text it is given. The prompt is the **only window** the model has into your goal, your audience, your constraints, and your definition of "good."

> **Core principle:** The output can only be as specific, accurate, and well-targeted as the information and structure in the input.

A vague prompt forces the model to guess. Each guess (tone, length, depth, format, audience) is a point where the result can drift away from what you wanted. A strong prompt removes those guesses.

---

## 2. The Mechanisms: How a Prompt Shapes the Output

| Mechanism | What it controls | Example of the effect |
|---|---|---|
| **Task definition** | What the model actually does | "Summarize" vs. "critique" vs. "rewrite" produce entirely different outputs from the same text |
| **Context** | What facts and background the model works from | Without context, the model fills gaps with generic or invented assumptions |
| **Role / persona** | Vocabulary, depth, perspective | "Act as a senior security auditor" shifts focus toward risks and edge cases |
| **Audience** | Level of explanation and tone | "Explain to a 10-year-old" vs. "explain to a PhD student" |
| **Constraints** | Boundaries (length, scope, what to avoid) | "Under 150 words, no jargon" |
| **Format** | Structure of the answer | Table, JSON, bullet list, step-by-step, essay |
| **Examples** | Style and pattern to imitate | Few-shot examples often beat paragraphs of description |
| **Reasoning instructions** | Quality of logic on complex tasks | "Think step by step, then give the final answer" |
| **Wording and order** | Emphasis and priority | Instructions at the end or stated clearly tend to be followed more reliably than ones buried mid-paragraph |

---

## 3. Key Factors That Affect Result Quality

### 3.1 Specificity
- **Vague:** "Write about climate change."
- **Specific:** "Write a 400-word explainer on how ocean warming affects coastal fisheries, for high-school students."

Specificity narrows the space of possible outputs toward the one you want.

### 3.2 Context
The model does not remember your project, your company, or your last conversation (unless provided). Include:
- Who you are or who the output is for
- What the output will be used for
- Relevant background, data, or source text
- What you have already tried

### 3.3 Clarity of Intent
State the **goal behind** the task, not just the task. "Rewrite this email" is weaker than "Rewrite this email so a frustrated customer feels heard and agrees to a call."

### 3.4 Constraints and Boundaries
Constraints guide as much as instructions do. Useful constraint types:
- **Length:** words, paragraphs, number of items
- **Scope:** what to include and what to exclude
- **Style:** formal, friendly, concise, technical
- **Sources:** "Use only the text below"

### 3.5 Output Format
If you need to paste the result into a spreadsheet, a codebase, or a report, say so. Specify the exact format (e.g., a JSON schema, a markdown table with named columns).

### 3.6 Examples (Few-Shot Prompting)
Showing one to three examples of ideal input and output is one of the most reliable ways to control style, structure, and level of detail. Include both **good** examples and, where useful, a **bad** example labeled as such.

### 3.7 Task Decomposition
Complex requests packed into one prompt often get shallow treatment. Breaking the work into steps (outline, then draft, then refine) usually yields better results.

---

## 4. Common Prompting Problems and Their Fixes

| Problem | Symptom in the result | Fix |
|---|---|---|
| Too vague | Generic, surface-level answer | Add specifics: topic angle, audience, depth |
| Missing context | Wrong assumptions, invented details | Provide background and source material |
| Conflicting instructions | Output satisfies some requirements, ignores others | Prioritize: "Most important is X; if space allows, Y" |
| No format specified | Wall of text or unusable structure | Define exact structure |
| Overloaded prompt | Some parts done well, others skipped | Split into sequential prompts |
| Ambiguous words | Misinterpreted terms ("short," "good," "professional") | Quantify: "under 100 words," "formal tone, no slang" |
| Negative-only instructions | Model fixates on the forbidden thing | Say what to do instead of only what not to do |
| No success criteria | You cannot judge or iterate | Define what "good" looks like |
| Asking for certainty on unknowns | Confident-sounding fabrication | Permit uncertainty: "If you are not sure, say so" |

---

## 5. A Framework for Building a Strong Prompt

Use this checklist (adapt the order as needed):

1. **Role**: Who should the model act as?
2. **Task**: What exactly should it do? (one clear verb)
3. **Context**: What background does it need?
4. **Audience and purpose**: Who reads it, and why?
5. **Constraints**: Length, scope, tone, exclusions
6. **Format**: Exact output structure
7. **Examples**: One or more samples of the target quality
8. **Quality criteria**: How will you judge it? What to double-check?

### Reusable Template

```
Role: You are a [role with relevant expertise].

Task: [Single, clear instruction.]

Context:
[Background, data, or source text.]

Audience & purpose: [Who will read this and what it is for.]

Constraints:
- [Length]
- [Tone/style]
- [What to include / exclude]

Output format:
[Exact structure, e.g., table with columns X, Y, Z.]

Example of desired output:
[Short sample.]

Before answering: [Optional: think step by step / list assumptions / flag uncertainty.]
```

---

## 6. Before and After: Worked Examples

### Example A: Content Writing

**Weak prompt**
> Write a blog post about productivity.

**Likely result:** Generic tips list ("make a to-do list, avoid distractions"), no clear voice, unclear length.

**Improved prompt**
> You are a productivity coach writing for remote software engineers. Write an 800-word blog post on why context-switching destroys deep work, and give 4 practical techniques to reduce it. Use a conversational tone, include one short real-world scenario, and end with a one-sentence call to action. Format with a headline and subheadings.

**Why it is better:** Defines audience, angle, length, structure, tone, and ending.

---

### Example B: Data Analysis

**Weak prompt**
> Analyze this sales data.

**Improved prompt**
> Here is monthly sales data for 2025 (CSV below). Identify the top 3 trends, flag any anomalies with a possible explanation, and recommend 2 actions for the next quarter. Present findings as: (1) a 3-bullet executive summary, (2) a table of anomalies with columns Month, Observation, Possible cause. State any assumptions you make.

---

### Example C: Coding

**Weak prompt**
> Fix my code.

**Improved prompt**
> This Python function should return the median of a list but fails on even-length lists. Here is the code, the input I used, the expected output, and the actual output. Explain the bug in two sentences, then give the corrected function with type hints and one test.

**Why it is better:** Supplies the expected versus actual behavior, which is the most valuable debugging information.

---

### Example D: Decision Support

**Weak prompt**
> Should I use React or Vue?

**Improved prompt**
> I am a solo developer building an internal dashboard for a 20-person team. I know JavaScript well but have no framework experience. Compare React and Vue on learning curve, ecosystem, and long-term maintenance for this case. Give a recommendation and the main reason, plus one scenario in which you would recommend the other.

---

## 7. Advanced Techniques

### 7.1 Chain-of-Thought and Step-by-Step Reasoning
For math, logic, planning, and multi-factor decisions, ask the model to reason before answering. This reduces careless errors.
> "Work through this step by step, then state your final answer on a separate line."

### 7.2 Prompt Chaining
Split big tasks into a pipeline, feeding each output into the next prompt:
1. Brainstorm angles
2. Pick the best and outline it
3. Draft each section
4. Critique the draft against criteria
5. Revise

### 7.3 Self-Critique and Revision
> "Write the draft. Then review it against these criteria: [list]. Then produce an improved final version."

### 7.4 Structured Delimiters
Separate instructions from data so the model does not confuse them. Use clear markers such as XML-style tags, triple quotes, or headers:
```
<instructions> ... </instructions>
<document> ... </document>
```
This is especially important when the input text itself contains instructions or questions.

### 7.5 Ask the Model to Ask You
For ambiguous tasks:
> "Before you start, ask me up to 3 clarifying questions if anything is unclear."

### 7.6 Grounding to Reduce Hallucination
- "Use only the information in the text below."
- "Quote the sentence that supports each claim."
- "If the answer is not in the source, say 'not found.'"

### 7.7 Controlling Reasoning Depth and Length
Specify the level directly: "brief overview," "detailed technical walkthrough," or "exactly 5 bullet points, one line each."

---

## 8. The Iteration Loop

Prompting is rarely right on the first try. Treat it as an engineering loop:

```
Write prompt -> Run -> Compare to goal -> Diagnose gap -> Adjust one thing -> Re-run
```

**Tips for effective iteration**
- **Change one variable at a time** so you know what caused the improvement.
- **Diagnose the specific gap.** Too long? Add a length limit. Wrong tone? Add tone and an example. Missing facts? Add context.
- **Keep a library** of prompts that worked, with notes on why.
- **Test with several inputs**, not just one, if the prompt will be reused.
- **Give feedback in follow-ups:** "Keep the structure but make the tone more direct and cut it by 30%."

---

## 9. How to Evaluate Whether a Prompt Is Good

Score the output against explicit criteria:

| Criterion | Question to ask |
|---|---|
| Relevance | Does it answer what I actually needed? |
| Accuracy | Are the facts and logic correct? (verify important claims) |
| Completeness | Are all requested parts covered? |
| Format fit | Can I use it directly without reworking? |
| Tone and audience fit | Would the intended reader respond well? |
| Consistency | Do repeated runs give similar quality? |

If a prompt will be used repeatedly (in an app or workflow), build a small test set of 5 to 10 representative inputs and check each prompt revision against it.

---

## 10. Pitfalls to Avoid

- **Assuming shared knowledge.** The model does not know your internal acronyms, goals, or constraints unless told.
- **Over-prompting.** Excess, repetitive, or contradictory instructions can hurt more than help. Be complete but concise.
- **Trusting fluent output as true.** Well-written does not mean correct. Verify facts, numbers, citations, and code.
- **Relying on tricks.** Clarity and context outperform "magic phrases."
- **Ignoring sensitive data.** Do not paste confidential or personal information into a prompt unless you are sure it is appropriate.
- **One giant prompt for everything.** Decompose complex work.

---

## 11. Quick Reference Cheat Sheet

1. **Be specific**: topic, angle, depth, audience.
2. **Give context**: background, data, purpose.
3. **State the goal**, not only the task.
4. **Set constraints**: length, tone, scope.
5. **Define the format** exactly.
6. **Show examples** of what good looks like.
7. **Ask for reasoning** on complex problems.
8. **Break big tasks** into steps.
9. **Allow uncertainty**: "say so if unsure."
10. **Iterate**: change one thing at a time and keep what works.

---

## 12. Summary

The prompt is the steering wheel. The model supplies the capability, but the **quality, relevance, and usability** of the result are largely determined by how clearly you communicate the task, context, constraints, and desired output. Improving prompts is a skill built on a simple habit: **remove ambiguity, supply what the model cannot know, define success, and iterate.**

---

### Suggested Next Steps
- Take one prompt you use often and rewrite it using the template in Section 5.
- Run the old and new versions on the same input and score both with the table in Section 9.
- Save the better version in a personal prompt library.