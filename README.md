# 🚀 ProtoFlow

ProtoFlow is an MVP for turning **BDD specifications written in Gherkin** into a connected system of:

- 📝 structured product documentation
- 🧭 navigable user flows
- 🧩 modular low-fidelity clickable prototypes

The core idea is simple: a single source of truth powers everything.

If the user updates the BDD, the flow and the prototype change.
If the user updates the flow, the documentation and the prototype should stay aligned.
If the user updates the prototype, the flow and the BDD should reflect that change too.

---

## ✨ Vision

ProtoFlow helps product thinking move faster by connecting three layers that are usually separated:

- **BDD / requirements**
- **navigation flow**
- **prototype structure**

Instead of writing scenarios in one tool, mapping the flow in another, and building mockups somewhere else, ProtoFlow keeps these artifacts tied together.

---

## 🧠 Current MVP

This first version already supports:

- parsing Gherkin-style text from a freeform editor
- recognizing custom semantic markers
- generating screens, scenarios, transitions, modals, and UI blocks
- rendering a clickable prototype canvas
- syncing screen/component edits back into normalized BDD text

### Supported markers

- `@screen` for screens
- `#component` for generic components
- `$modal` for modals
- `!action` for primary actions
- `%form` for forms
- `&state` for states

Example:

```gherkin
Feature: Credential

Scenario: Login
Given que eu estou em @teladelogin
And vejo o %formulariologin com os componentes #login e #senha
And vejo a acao !entrar
When eu executo !entrar com dados validos
Then o sistema me autentica
And o sistema me apresenta $modaldeconfirmacaodelogin
And o sistema me leva para @telainicial
```

---

## 🧩 Product Concept

ProtoFlow was designed around a **unified data model** that feeds:

- the BDD editor
- the flow between screens
- the clickable prototype

This makes the project especially useful for:

- solo product discovery
- early feature design
- flow validation before UI polish
- documentation-first prototyping

---

## 🛠️ Stack

- **React 19**
- **Vite**
- **ESLint**
- custom parser logic for semantic Gherkin markers

---

## 🖥️ Local Development

### Install

```bash
npm install
```

### Run

```bash
npm run dev
```

### Validate

```bash
npm run lint
npm run build
```

---

## 📁 Project Structure

```text
src/
  App.jsx       # main MVP logic, parser, flow model, prototype rendering
  App.css       # product UI and layout styling
  index.css     # global styles
```

---

## 🎯 What Makes ProtoFlow Interesting

- **BDD-first**: scenarios are the entry point
- **modular UI**: screens are assembled from reusable blocks
- **traceable changes**: one artifact influences the others
- **product-oriented**: built for thinking through behavior, not just polishing visuals

---

## 🔭 Next Steps

Planned evolutions for the next iterations:

- visual graph with nodes and edges between screens
- richer bidirectional editing between flow and BDD
- persistent storage for features and scenarios
- reusable component presets for common product management flows
- export/share options for documentation and prototype review

---

## 🤝 Repository

GitHub: [kiltonfernandes/ProtoFlow](https://github.com/kiltonfernandes/ProtoFlow)

---

## 📜 Changelog

### `v0.1.0` - Initial MVP

- created the React + Vite project base
- added a Gherkin editor with semantic parsing
- introduced support for `@`, `#`, `$`, `!`, `%`, and `&` markers
- generated a unified model for documentation, flow, and prototype
- built a modular prototype canvas with a starter component library
- enabled clickable navigation between generated screens
- added initial GitHub-ready project documentation
