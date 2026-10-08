---
name: council
description: «مجلس المستشارين» (Claude Council / llm-council) for مغاسيل صداقة - put a big idea, plan or decision of the owner in front of 5 independent advisors, an anonymous peer review and a chairman's verdict BEFORE building it. Use when the owner's message STARTS WITH the digit «5» (e.g. «5 هل نضيف قسم توصيل؟»), or when he writes «اعرضها على المجلس» / «المجلس» / «Council», or asks "is this a good idea / what should we build next / which way is better" about something large (a new feature area, a business model change, the development plan). Not for small fixes or clear requests.
---

# مجلس المستشارين - an idea judged before it is built

The owner's Oct 2026 choice: big ideas go to a council first (the «Claude Council» method,
from Karpathy's LLM Council). One answer from one angle tends to agree with him; five advisors who
can't see each other, then review each other blind, find the holes and the hidden chance.
Everything the owner reads is in **Arabic**.

**Trigger rule (this repo):** a message whose first character is the digit **5** means
«اعرض ما يلي على المجلس». Strip the leading «5» and treat the rest as the question. A message that
does not start with 5 and is a clear build/fix request goes through the normal `pressing-app` flow.

## 0. The brief (you, before anyone else)

Write one brief (Arabic or English, ≤ 600 words) every advisor gets, word for word:
- The question, in his words, and what decision he must make.
- The facts that matter: read `CLAUDE.md`, `.claude/skills/pressing-app/SKILL.md` and the
  code areas involved in `index.html`; say what exists already (so nobody proposes what's built)
  and the hard limits (single `index.html`, no build tools, no server of our own, Firebase Firestore
  single document under 1MB, photos only in IndexedDB, Arabic RTL with Latin digits, owner +
  managers + workers roles, PWA + APK wrapper, every change must pass `bash tests/run.sh`).
- No customer names, phones, emails, codes or keys - ever.

## 1. Five independent opinions (5 subagents in parallel, one message)

Each gets the brief + his role, must NOT see the others, answers in ≤ 350 words, ending with his
single most important point:

1. **المعارض (The Contrarian)** - assumes the idea fails; finds the fatal flaw. «أين يمكن أن تنهار؟»
2. **مفكّر المبادئ الأولى (First Principles)** - drops the surface question, rebuilds it from the
   real goal. «ما المشكلة الحقيقية هنا؟»
3. **صائد الفرص (The Expansionist)** - the bigger hidden opportunity. «ما الفرصة الأكبر التي لم ينتبه لها؟»
4. **المبتدئ (The Outsider)** - reads it like a newcomer; what's unclear or assumed.
   «لو سمعت الفكرة لأول مرة، ما غير الواضح؟»
5. **المنفّذ (The Executor)** - reality and execution; the concrete next step.
   «ما أول خطوة تُعمل صباح الغد؟»

## 2. Blind peer review (5 subagents in parallel)

Label the five answers A-E in a **random order** (no role names). Each reviewer gets the brief and
A-E and answers: (1) which answer is strongest and why, (2) which has the biggest blind spot and
what it is, (3) **what did ALL the answers miss?** - question 3 is the gold.

## 3. The chairman's verdict (you)

Read everything and write the report in Arabic, 5 parts:
1. **أين اتفق المجلس** - points several advisors reached on their own (strong signals).
2. **أين اختلف** - the real disagreements and why reasonable people differ.
3. **النقاط العمياء** - things that only surfaced in the peer review.
4. **التوصية** - a clear, direct answer with its reasons - not "it depends".
5. **أول خطوة** - ONE specific thing to start with. Not a list.

## 4. Deliver

- Publish the report as an HTML Artifact (Arabic, RTL, readable at 360px; load `artifact-design`
  first): the verdict on top, then the five opinions and the review summary folded below it. Give
  him the link and a short Arabic summary in chat (the recommendation + the first step).
- Then ask him (AskUserQuestion, recommended option first «(مقترح)») whether to build the first
  step. Build nothing before his answer; once he decides, record the decision in
  `.claude/skills/council/decisions.md` (date, question, verdict, his decision).

---
Source: copied from `YAHYASIDE/starnetbroser` (`.claude/skills/council/SKILL.md`) on the owner's
request and adapted to this repository (facts, limits, trigger «5», decisions file).
