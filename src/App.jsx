import { useMemo, useState } from 'react'
import './App.css'

const COMPONENT_LIBRARY = [
  { type: 'input', label: 'Input', category: 'Formularios' },
  { type: 'password', label: 'Password', category: 'Formularios' },
  { type: 'textarea', label: 'Textarea', category: 'Formularios' },
  { type: 'select', label: 'Select', category: 'Formularios' },
  { type: 'checkbox', label: 'Checkbox', category: 'Formularios' },
  { type: 'button', label: 'Button', category: 'Botoes e Acoes' },
  { type: 'button-group', label: 'Button Group', category: 'Botoes e Acoes' },
  { type: 'tabs', label: 'Tabs', category: 'Navegacao' },
  { type: 'table', label: 'Data Table', category: 'Dados e Tabelas' },
  { type: 'card', label: 'Card', category: 'Layouts e Containers' },
  { type: 'modal', label: 'Modal', category: 'Layouts e Containers' },
  { type: 'alert', label: 'Alert', category: 'Feedback e Estados' },
  { type: 'toast', label: 'Toast', category: 'Feedback e Estados' },
  { type: 'datepicker', label: 'Date Picker', category: 'Avancados e Utilitarios' },
]

const TOKEN_DEFINITIONS = {
  '@': { kind: 'screen', label: 'Tela' },
  '#': { kind: 'component', label: 'Componente' },
  '$': { kind: 'modal', label: 'Modal' },
  '!': { kind: 'action', label: 'Acao' },
  '%': { kind: 'form', label: 'Formulario' },
  '&': { kind: 'state', label: 'Estado' },
}

const DEFAULT_BDD = `Feature: Credential

Scenario: Login
Given que eu estou em @teladelogin
And vejo o %formulariologin com os componentes #login e #senha
And vejo a acao !entrar
When eu executo !entrar com dados validos
Then o sistema me autentica
And o sistema me apresenta $modaldeconfirmacaodelogin
And o sistema me leva para @telainicial

Scenario: Signup
Given que eu estou em @telacadastro
And vejo o %formulariocadastro com os componentes #nome, #email e #senha
And vejo a acao !criarconta
When eu executo !criarconta com dados validos
Then o sistema cria a minha conta
And o sistema me leva para @telainicial

Scenario: Forgot password
Given que eu estou em @telarecuperarsenha
And vejo o %formulariorecuperacao com o componente #email
And vejo a acao !enviarlink
When eu executo !enviarlink
Then o sistema me apresenta $modaldeinstrucoes
And o sistema me leva para @telalogin
`

function slugifyToken(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function titleFromToken(token) {
  const cleaned = token.replace(/^[@#$]/, '')
  const withSpaces = cleaned.replace(/([a-z])([A-Z])/g, '$1 $2')
  return withSpaces.replace(/(^\w|\s\w)/g, (match) => match.toUpperCase())
}

function uniqueById(items) {
  const seen = new Set()
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false
    }

    seen.add(item.id)
    return true
  })
}

function parseReferences(line, marker) {
  const regex = new RegExp(`\\${marker}([a-zA-Z0-9_\\-]+)`, 'g')
  return [...line.matchAll(regex)].map((match) => ({
    id: slugifyToken(match[1]),
    token: match[1],
    label: titleFromToken(match[1]),
  }))
}

function parseAllTokens(line) {
  return Object.keys(TOKEN_DEFINITIONS).flatMap((marker) =>
    parseReferences(line, marker === '$' ? '\\$' : marker).map((reference) => ({
      ...reference,
      marker,
      kind: TOKEN_DEFINITIONS[marker].kind,
    })),
  )
}

function buildScenarioSummary(scenario) {
  if (!scenario.destinationIds.length && !scenario.modalIds.length) {
    return 'Fluxo em construo'
  }

  const parts = []

  if (scenario.modalIds.length) {
    parts.push(`abre ${scenario.modalIds.map(titleFromToken).join(', ')}`)
  }

  if (scenario.destinationIds.length) {
    parts.push(`navega para ${scenario.destinationIds.map(titleFromToken).join(', ')}`)
  }

  return parts.join(' e ')
}

function parseBDD(text) {
  const lines = text.split(/\r?\n/)
  const featureMatch = lines.find((line) => /^\s*Feature:/i.test(line))
  const featureName = featureMatch ? featureMatch.split(':')[1].trim() : 'Nova Feature'
  const scenarios = []
  let activeScenario = null

  lines.forEach((rawLine) => {
    const line = rawLine.trim()
    if (!line) {
      return
    }

    if (/^Scenario:/i.test(line)) {
      if (activeScenario) {
        scenarios.push(activeScenario)
      }

      activeScenario = {
        id: slugifyToken(line) || `scenario${scenarios.length + 1}`,
        name: line.split(':')[1].trim(),
        startScreenId: '',
        startScreenLabel: '',
        components: [],
        forms: [],
        actions: [],
        states: [],
        modalIds: [],
        destinationIds: [],
        whenText: 'eu executo a acao principal',
        outcomeText: 'o sistema responde corretamente',
      }
      return
    }

    if (!activeScenario) {
      return
    }

    const screens = parseReferences(line, '@')
    const components = parseReferences(line, '#')
    const modals = parseReferences(line, '\\$')
    const actions = parseReferences(line, '!')
    const forms = parseReferences(line, '%')
    const states = parseReferences(line, '&')

    if (/^(given|dado)/i.test(line) && screens.length) {
      activeScenario.startScreenId = screens[0].id
      activeScenario.startScreenLabel = screens[0].label
    }

    if (/^(and|e)/i.test(line) && components.length) {
      activeScenario.components = uniqueById([
        ...activeScenario.components,
        ...components.map((component) => ({
          id: component.id,
          label: component.label,
          type: 'input',
          source: 'bdd',
        })),
      ])
    }

    if (/^(and|e)/i.test(line) && forms.length) {
      activeScenario.forms = uniqueById([
        ...activeScenario.forms,
        ...forms.map((form) => ({
          id: form.id,
          label: form.label,
          type: 'form',
          source: 'bdd',
        })),
      ])
    }

    if (/^(and|e|when|quando)/i.test(line) && actions.length) {
      activeScenario.actions = uniqueById([
        ...activeScenario.actions,
        ...actions.map((action) => ({
          id: action.id,
          label: action.label,
          type: 'button',
          source: 'bdd',
        })),
      ])
    }

    if (/^(then|entao|and|e)/i.test(line) && states.length) {
      activeScenario.states = uniqueById([
        ...activeScenario.states,
        ...states.map((state) => ({
          id: state.id,
          label: state.label,
        })),
      ])
    }

    if (/^(when|quando)/i.test(line)) {
      activeScenario.whenText = line.replace(/^(when|quando)\s+/i, '')
    }

    if (/^(then|entao|and|e)/i.test(line) && modals.length) {
      activeScenario.modalIds = uniqueById([
        ...activeScenario.modalIds.map((modalId) => ({
          id: modalId,
          label: titleFromToken(modalId),
        })),
        ...modals,
      ]).map((modal) => modal.id)
    }

    if (/^(then|entao|and|e)/i.test(line) && screens.length) {
      screens.forEach((screen) => {
        if (screen.id !== activeScenario.startScreenId) {
          activeScenario.destinationIds.push(screen.id)
        }
      })
    }

    if (/^(then|entao)/i.test(line)) {
      activeScenario.outcomeText = line.replace(/^(then|entao)\s+/i, '')
    }
  })

  if (activeScenario) {
    scenarios.push(activeScenario)
  }

  const screensMap = new Map()

  scenarios.forEach((scenario) => {
    if (!scenario.startScreenId) {
      scenario.startScreenId = slugifyToken(`tela${scenario.name}`)
      scenario.startScreenLabel = titleFromToken(scenario.startScreenId)
    }

    if (!screensMap.has(scenario.startScreenId)) {
      screensMap.set(scenario.startScreenId, {
        id: scenario.startScreenId,
        label: scenario.startScreenLabel || titleFromToken(scenario.startScreenId),
        components: [],
      })
    }

    const screen = screensMap.get(scenario.startScreenId)
    screen.components = uniqueById([
      ...screen.components,
      ...scenario.forms.map((form) => ({
        ...form,
        label: form.label || titleFromToken(form.id),
      })),
      ...scenario.components.map((component) => ({
        ...component,
        label: component.label || titleFromToken(component.id),
      })),
      ...scenario.actions.map((action) => ({
        ...action,
        label: action.label || titleFromToken(action.id),
      })),
    ])

    scenario.destinationIds = [...new Set(scenario.destinationIds)]

    scenario.destinationIds.forEach((destinationId) => {
      if (!screensMap.has(destinationId)) {
        screensMap.set(destinationId, {
          id: destinationId,
          label: titleFromToken(destinationId),
          components: [],
        })
      }
    })
  })

  const screens = Array.from(screensMap.values())
  const selectedScreenId = screens[0]?.id ?? ''

  return {
    featureName,
    scenarios,
    screens,
    selectedScreenId,
  }
}

function serializeBDD(model) {
  const lines = [`Feature: ${model.featureName}`, '']

  model.scenarios.forEach((scenario) => {
    const screen = model.screens.find((item) => item.id === scenario.startScreenId)
    const screenLabel = screen?.id || scenario.startScreenId
    const components = screen?.components ?? []

    lines.push(`Scenario: ${scenario.name}`)
    lines.push(`Given que eu estou em @${screenLabel}`)

    if (components.length) {
      const forms = components.filter((component) => component.type === 'form')
      const fields = components.filter((component) =>
        ['input', 'password', 'textarea', 'select', 'checkbox'].includes(component.type),
      )
      const actions = components.filter((component) =>
        ['button', 'button-group'].includes(component.type),
      )

      forms.forEach((form) => {
        lines.push(`And vejo o %${form.id}`)
      })

      if (fields.length) {
        lines.push(`And vejo os componentes ${fields.map((component) => `#${component.id}`).join(', ')}`)
      }

      actions.forEach((action) => {
        lines.push(`And vejo a acao !${action.id}`)
      })
    }

    lines.push(`When ${scenario.whenText}`)
    lines.push(`Then ${scenario.outcomeText}`)

    scenario.modalIds.forEach((modalId) => {
      lines.push(`And o sistema me apresenta $${modalId}`)
    })

    scenario.destinationIds.forEach((destinationId) => {
      lines.push(`And o sistema me leva para @${destinationId}`)
    })

    lines.push('')
  })

  return lines.join('\n').trim()
}

function renderPrototypeComponent(component) {
  switch (component.type) {
    case 'form':
      return (
        <div className="form-shell">
          <strong>{component.label}</strong>
          <p>Container de formulario para agrupar campos do fluxo.</p>
        </div>
      )
    case 'password':
      return <input type="password" placeholder={component.label} readOnly />
    case 'textarea':
      return <textarea rows="4" placeholder={component.label} readOnly />
    case 'select':
      return (
        <select defaultValue="" disabled>
          <option value="" disabled>
            {component.label}
          </option>
        </select>
      )
    case 'checkbox':
      return (
        <label className="check-field">
          <input type="checkbox" disabled />
          <span>{component.label}</span>
        </label>
      )
    case 'button':
      return <button type="button">{component.label}</button>
    case 'button-group':
      return (
        <div className="button-group">
          <button type="button">{component.label}</button>
          <button type="button">Secondary</button>
        </div>
      )
    case 'tabs':
      return (
        <div className="tabs-mock">
          <span className="active-tab">{component.label}</span>
          <span>Overview</span>
          <span>History</span>
        </div>
      )
    case 'table':
      return (
        <div className="table-mock">
          <div className="table-head">
            <span>Produto</span>
            <span>Status</span>
            <span>Dono</span>
          </div>
          <div className="table-row">
            <span>{component.label}</span>
            <span>Ativo</span>
            <span>Voce</span>
          </div>
        </div>
      )
    case 'card':
      return (
        <div className="card-mock">
          <strong>{component.label}</strong>
          <p>Bloco reutilizavel para o prototipo.</p>
        </div>
      )
    case 'alert':
      return <div className="alert-mock">{component.label}</div>
    case 'toast':
      return <div className="toast-mock">{component.label}</div>
    case 'datepicker':
      return <input type="date" readOnly />
    case 'modal':
      return (
        <div className="modal-inline">
          <strong>{component.label}</strong>
          <p>Modal embutido no canvas da tela.</p>
        </div>
      )
    default:
      return <input type="text" placeholder={component.label} readOnly />
  }
}

function App() {
  const [bddText, setBddText] = useState(DEFAULT_BDD)
  const [model, setModel] = useState(() => parseBDD(DEFAULT_BDD))
  const [parseError, setParseError] = useState('')

  const selectedScreen = useMemo(
    () => model.screens.find((screen) => screen.id === model.selectedScreenId) ?? model.screens[0],
    [model],
  )

  const scenariosForSelectedScreen = useMemo(
    () => model.scenarios.filter((scenario) => scenario.startScreenId === selectedScreen?.id),
    [model.scenarios, selectedScreen],
  )

  function syncModel(nextModel) {
    setModel(nextModel)
    setBddText(serializeBDD(nextModel))
  }

  function updateBDDText(value) {
    setBddText(value)

    try {
      const nextModel = parseBDD(value)
      setModel((current) => ({
        ...nextModel,
        selectedScreenId:
          current.selectedScreenId && nextModel.screens.some((screen) => screen.id === current.selectedScreenId)
            ? current.selectedScreenId
            : nextModel.selectedScreenId,
      }))
      setParseError('')
    } catch {
      setParseError('Nao foi possivel interpretar o BDD. Revise a estrutura da feature.')
    }
  }

  function setSelectedScreen(screenId) {
    setModel((current) => ({ ...current, selectedScreenId: screenId }))
  }

  function updateFeatureName(value) {
    syncModel({
      ...model,
      featureName: value || 'Nova Feature',
    })
  }

  function addScenario() {
    const baseScreenId = selectedScreen?.id ?? `tela${model.screens.length + 1}`
    const nextScenario = {
      id: `scenario${Date.now()}`,
      name: `Novo fluxo ${model.scenarios.length + 1}`,
      startScreenId: baseScreenId,
        startScreenLabel: titleFromToken(baseScreenId),
        components: [],
        forms: [],
        actions: [],
        states: [],
        modalIds: [],
        destinationIds: [],
        whenText: 'eu executo a acao principal',
      outcomeText: 'o sistema responde corretamente',
    }

    syncModel({
      ...model,
      scenarios: [...model.scenarios, nextScenario],
    })
  }

  function addScreen() {
    const id = `novatela${model.screens.length + 1}`
    const nextModel = {
      ...model,
      screens: [
        ...model.screens,
        {
          id,
          label: `Nova Tela ${model.screens.length + 1}`,
          components: [],
        },
      ],
      selectedScreenId: id,
    }

    syncModel(nextModel)
  }

  function addComponent(template) {
    if (!selectedScreen) {
      return
    }

    const baseId = slugifyToken(`${template.type}${selectedScreen.components.length + 1}`)
    const nextScreens = model.screens.map((screen) =>
      screen.id === selectedScreen.id
        ? {
            ...screen,
            components: [
              ...screen.components,
              {
                id: baseId,
                label: `${template.label} ${screen.components.length + 1}`,
                type: template.type,
                source: 'library',
              },
            ],
          }
        : screen,
    )

    syncModel({
      ...model,
      screens: nextScreens,
    })
  }

  function updateComponentLabel(componentId, label) {
    const nextScreens = model.screens.map((screen) =>
      screen.id === selectedScreen.id
        ? {
            ...screen,
            components: screen.components.map((component) =>
              component.id === componentId ? { ...component, label } : component,
            ),
          }
        : screen,
    )

    syncModel({
      ...model,
      screens: nextScreens,
    })
  }

  function removeComponent(componentId) {
    const nextScreens = model.screens.map((screen) =>
      screen.id === selectedScreen.id
        ? {
            ...screen,
            components: screen.components.filter((component) => component.id !== componentId),
          }
        : screen,
    )

    syncModel({
      ...model,
      screens: nextScreens,
    })
  }

  function addDestination(destinationId) {
    const scenario = scenariosForSelectedScreen[0]
    if (!scenario || !destinationId) {
      return
    }

    const nextScenarios = model.scenarios.map((item) =>
      item.id === scenario.id
        ? {
            ...item,
            destinationIds: [...new Set([...item.destinationIds, destinationId])],
          }
        : item,
    )

    syncModel({
      ...model,
      scenarios: nextScenarios,
    })
  }

  function addModalToScenario() {
    const scenario = scenariosForSelectedScreen[0]
    if (!scenario) {
      return
    }

    const modalId = `modal${scenario.modalIds.length + 1}${selectedScreen.id}`
    const nextScenarios = model.scenarios.map((item) =>
      item.id === scenario.id
        ? {
            ...item,
            modalIds: [...item.modalIds, modalId],
          }
        : item,
    )

    syncModel({
      ...model,
      scenarios: nextScenarios,
    })
  }

  const libraryByCategory = COMPONENT_LIBRARY.reduce((accumulator, item) => {
    accumulator[item.category] = accumulator[item.category] ?? []
    accumulator[item.category].push(item)
    return accumulator
  }, {})

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">BDD Prototype Builder</p>
          <h1>MVP para transformar Gherkin em fluxo e prototipo clicavel</h1>
          <p className="hero-copy">
            O texto em Gherkin gera a estrutura da feature, o fluxo entre telas e um canvas modular com componentes reutilizaveis.
          </p>
        </div>
        <div className="hero-metrics">
          <div>
            <strong>{model.screens.length}</strong>
            <span>Telas</span>
          </div>
          <div>
            <strong>{model.scenarios.length}</strong>
            <span>Cenarios</span>
          </div>
          <div>
            <strong>{model.scenarios.reduce((sum, item) => sum + item.destinationIds.length, 0)}</strong>
            <span>Conexoes</span>
          </div>
        </div>
      </header>

      <main className="workspace-grid">
        <section className="panel panel-editor">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Documentacao</p>
              <h2>Feature em Gherkin</h2>
            </div>
            <button type="button" className="ghost-button" onClick={addScenario}>
              Novo scenario
            </button>
          </div>

          <label className="field-stack">
            <span>Nome da feature</span>
            <input
              type="text"
              value={model.featureName}
              onChange={(event) => updateFeatureName(event.target.value)}
            />
          </label>

          <label className="field-stack grow">
            <span>BDD source</span>
            <textarea
              className="bdd-editor"
              value={bddText}
              onChange={(event) => updateBDDText(event.target.value)}
              spellCheck="false"
            />
          </label>

          <div className="hint-box">
            <strong>Convencoes do MVP</strong>
            <p>
              Use <code>@</code> para telas, <code>#</code> para componentes, <code>$</code> para modais, <code>!</code> para acoes, <code>%</code> para formularios e <code>&amp;</code> para estados.
            </p>
            {parseError ? <p className="error-text">{parseError}</p> : null}
          </div>
        </section>

        <section className="panel panel-flow">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Fluxo</p>
              <h2>Mapa navegavel</h2>
            </div>
            <button type="button" className="ghost-button" onClick={addScreen}>
              Nova tela
            </button>
          </div>

          <div className="screen-list">
            {model.screens.map((screen) => (
              <button
                key={screen.id}
                type="button"
                className={`screen-node ${screen.id === selectedScreen?.id ? 'active' : ''}`}
                onClick={() => setSelectedScreen(screen.id)}
              >
                <strong>@{screen.id}</strong>
                <span>{screen.components.length} componentes</span>
              </button>
            ))}
          </div>

          <div className="scenario-stack">
            {model.scenarios.map((scenario) => (
              <article key={scenario.id} className="scenario-card">
                <p className="scenario-name">{scenario.name}</p>
                <p className="scenario-origin">Origem: @{scenario.startScreenId}</p>
                <p className="scenario-summary">{buildScenarioSummary(scenario)}</p>
                <div className="token-row">
                  {parseAllTokens(
                    [
                      `@${scenario.startScreenId}`,
                      ...scenario.destinationIds.map((item) => `@${item}`),
                      ...scenario.modalIds.map((item) => `$${item}`),
                      ...scenario.components.map((item) => `#${item.id}`),
                      ...scenario.forms.map((item) => `%${item.id}`),
                      ...scenario.actions.map((item) => `!${item.id}`),
                      ...scenario.states.map((item) => `&${item.id}`),
                    ].join(' '),
                  ).map((token) => (
                    <span key={`${scenario.id}-${token.marker}-${token.id}`} className={`token-chip ${token.kind}`}>
                      {token.marker}
                      {token.id}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>

          {selectedScreen ? (
            <div className="flow-actions">
              <label className="field-stack">
                <span>Adicionar navegacao para</span>
                <select defaultValue="" onChange={(event) => addDestination(event.target.value)}>
                  <option value="" disabled>
                    Escolha uma tela
                  </option>
                  {model.screens
                    .filter((screen) => screen.id !== selectedScreen.id)
                    .map((screen) => (
                      <option key={screen.id} value={screen.id}>
                        @{screen.id}
                      </option>
                    ))}
                </select>
              </label>
              <button type="button" className="ghost-button" onClick={addModalToScenario}>
                Adicionar modal ao fluxo atual
              </button>
            </div>
          ) : null}
        </section>

        <section className="panel panel-prototype">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Prototipo</p>
              <h2>Canvas de tela</h2>
            </div>
          </div>

          {selectedScreen ? (
            <>
              <div className="prototype-header">
                <div>
                  <span className="device-pill">Screen</span>
                  <h3>@{selectedScreen.id}</h3>
                </div>
                <p>{scenariosForSelectedScreen[0]?.outcomeText ?? 'Sem scenario associado ainda.'}</p>
              </div>

              <div className="prototype-canvas">
                {selectedScreen.components.length ? (
                  selectedScreen.components.map((component) => (
                    <div key={component.id} className="prototype-block">
                      <div className="prototype-block-head">
                        <span>#{component.id}</span>
                        <small>{component.type}</small>
                      </div>
                      {renderPrototypeComponent(component)}
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <strong>Tela em branco</strong>
                    <p>Adicione componentes da biblioteca para montar o wireframe.</p>
                  </div>
                )}

                {scenariosForSelectedScreen.flatMap((scenario) =>
                  scenario.modalIds.map((modalId) => (
                    <div key={modalId} className="modal-preview">
                      <strong>${modalId}</strong>
                      <p>Modal derivado do fluxo atual.</p>
                    </div>
                  )),
                )}
              </div>

              {scenariosForSelectedScreen.length ? (
                <div className="navigation-strip">
                  {scenariosForSelectedScreen.flatMap((scenario) =>
                    scenario.destinationIds.map((destinationId) => (
                      <button
                        key={`${scenario.id}-${destinationId}`}
                        type="button"
                        className="nav-jump"
                        onClick={() => setSelectedScreen(destinationId)}
                      >
                        Ir para @{destinationId}
                      </button>
                    )),
                  )}
                </div>
              ) : null}

              <div className="component-editor">
                <div className="subpanel">
                  <h3>Biblioteca de componentes</h3>
                  <p className="subtle-text">
                    Estrutura unica de dados: o que entra aqui reflete no prototipo, no fluxo e no BDD normalizado.
                  </p>
                  {Object.entries(libraryByCategory).map(([category, items]) => (
                    <div key={category} className="library-group">
                      <p>{category}</p>
                      <div className="library-chips">
                        {items.map((item) => (
                          <button
                            key={`${category}-${item.type}`}
                            type="button"
                            className="chip-button"
                            onClick={() => addComponent(item)}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="subpanel">
                  <h3>Componentes da tela</h3>
                  {selectedScreen.components.length ? (
                    selectedScreen.components.map((component) => (
                      <div key={component.id} className="component-row">
                        <div>
                          <strong>#{component.id}</strong>
                          <span>{component.type}</span>
                        </div>
                        <input
                          type="text"
                          value={component.label}
                          onChange={(event) => updateComponentLabel(component.id, event.target.value)}
                        />
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => removeComponent(component.id)}
                        >
                          Remover
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="subtle-text">Nenhum componente ainda nessa tela.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <strong>Nenhuma tela encontrada</strong>
              <p>Crie uma tela ou escreva um scenario com `@nomedatela`.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
