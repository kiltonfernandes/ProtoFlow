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

const BLANK_BDD = `Feature: Product Management

Scenario: Cadastro de produto
Given que eu estou em @telacadastroproduto
And vejo o %formularioproduto
And vejo os componentes #nomeproduto, #sku, #categoria
And vejo a acao !salvarproduto
When eu executo !salvarproduto
Then o sistema cadastra o produto
And o sistema me leva para @telalistadeprodutos
`

const QUICK_SNIPPETS = [
  { label: '@tela', snippet: '@telaproduto', help: 'Marca uma tela do fluxo.' },
  { label: '#componente', snippet: '#nomeproduto', help: 'Marca um componente da tela.' },
  { label: '$modal', snippet: '$modalconfirmacao', help: 'Marca um modal do fluxo.' },
  { label: '!acao', snippet: '!salvarproduto', help: 'Marca uma acao clicavel.' },
  { label: '%formulario', snippet: '%formularioproduto', help: 'Marca um formulario.' },
  { label: '&estado', snippet: '&sucesso', help: 'Marca um estado importante.' },
]

const JOURNEYS = [
  {
    title: 'Criar uma nova feature',
    summary: 'Escreva um scenario inicial e veja o ProtoFlow criar as telas e destinos automaticamente.',
  },
  {
    title: 'Refinar o fluxo',
    summary: 'Escolha um scenario, ajuste telas de destino e modele os pontos de transicao do produto.',
  },
  {
    title: 'Testar o prototipo',
    summary: 'Entre na tela gerada, adicione componentes e clique nos proximos passos para validar a navegacao.',
  },
]

const HEURISTIC_NOTES = [
  {
    title: 'Visibilidade do estado do sistema',
    summary: 'A interface agora deixa claro em qual etapa voce esta e qual screen e scenario estao ativos.',
  },
  {
    title: 'Reconhecimento em vez de memorizacao',
    summary: 'Os marcadores semanticos e os proximos passos ficam sempre visiveis, sem exigir lembrar a sintaxe.',
  },
  {
    title: 'Controle e liberdade do usuario',
    summary: 'Voce pode navegar entre Builder, Fluxo e Prototipo sem perder contexto.',
  },
  {
    title: 'Estetica e minimalismo',
    summary: 'Cada area agora faz uma coisa principal, sem competir pela atencao ao mesmo tempo.',
  },
]

function slugifyToken(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function titleFromToken(token) {
  const cleaned = token.replace(/^[@#$!%&]/, '')
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

function buildScenarioSummary(scenario) {
  if (!scenario.destinationIds.length && !scenario.modalIds.length) {
    return 'Fluxo em construcao'
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
  const selectedScenarioId = scenarios[0]?.id ?? ''

  return {
    featureName,
    scenarios,
    screens,
    selectedScreenId,
    selectedScenarioId,
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
          <p>Container principal do formulario.</p>
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
          <p>Bloco reutilizavel do wireframe.</p>
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
          <p>Modal embutido no canvas.</p>
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
  const [workspaceView, setWorkspaceView] = useState('overview')

  const selectedScenario = useMemo(
    () => model.scenarios.find((scenario) => scenario.id === model.selectedScenarioId) ?? model.scenarios[0],
    [model],
  )

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
        selectedScenarioId:
          current.selectedScenarioId &&
          nextModel.scenarios.some((scenario) => scenario.id === current.selectedScenarioId)
            ? current.selectedScenarioId
            : nextModel.selectedScenarioId,
      }))
      setParseError('')
    } catch {
      setParseError('Nao foi possivel interpretar o BDD. Revise a estrutura da feature.')
    }
  }

  function loadExample(exampleText) {
    updateBDDText(exampleText)
    setWorkspaceView('builder')
  }

  function insertSnippet(snippet) {
    updateBDDText(`${bddText.trim()}\n${snippet}`)
    setWorkspaceView('builder')
  }

  function setSelectedScreen(screenId) {
    const scenarioForScreen = model.scenarios.find((scenario) => scenario.startScreenId === screenId)

    setModel((current) => ({
      ...current,
      selectedScreenId: screenId,
      selectedScenarioId: scenarioForScreen?.id ?? current.selectedScenarioId,
    }))
  }

  function setSelectedScenario(scenarioId) {
    const scenario = model.scenarios.find((item) => item.id === scenarioId)

    setModel((current) => ({
      ...current,
      selectedScenarioId: scenarioId,
      selectedScreenId: scenario?.startScreenId ?? current.selectedScreenId,
    }))
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
      selectedScenarioId: nextScenario.id,
    })
  }

  function addScreen() {
    const id = `novatela${model.screens.length + 1}`
    syncModel({
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
    })
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
    if (!selectedScenario || !destinationId) {
      return
    }

    const nextScenarios = model.scenarios.map((item) =>
      item.id === selectedScenario.id
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
    if (!selectedScenario) {
      return
    }

    const modalId = `modal${selectedScenario.modalIds.length + 1}${selectedScenario.startScreenId}`
    const nextScenarios = model.scenarios.map((item) =>
      item.id === selectedScenario.id
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

  const sidebarItems = [
    { id: 'overview', step: '01', label: 'Overview', hint: 'Entenda e comece' },
    { id: 'builder', step: '02', label: 'Builder', hint: 'Escreva o BDD' },
    { id: 'flow', step: '03', label: 'Fluxo', hint: 'Revise a navegacao' },
    { id: 'prototype', step: '04', label: 'Prototipo', hint: 'Teste a interface' },
  ]

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">ProtoFlow</p>
          <h1>Do scenario ao prototipo, sem perder o fio da meada</h1>
          <p className="hero-copy">
            Reestruturado para voce trabalhar por jornadas: entender, escrever, revisar fluxo e testar o prototipo.
          </p>
          <div className="hero-actions">
            <button type="button" className="ghost-button" onClick={() => loadExample(DEFAULT_BDD)}>
              Carregar exemplo
            </button>
            <button type="button" className="secondary-button" onClick={() => loadExample(BLANK_BDD)}>
              Nova feature em branco
            </button>
          </div>
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

      <div className="app-frame">
        <aside className="sidebar">
          <div className="sidebar-block">
            <p className="sidebar-label">Workspace</p>
            <div className="sidebar-nav">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={workspaceView === item.id ? 'sidebar-link active' : 'sidebar-link'}
                  onClick={() => setWorkspaceView(item.id)}
                >
                  <span>{item.step}</span>
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-block">
            <p className="sidebar-label">Resumo ativo</p>
            <div className="mini-card">
              <span>Feature</span>
              <strong>{model.featureName}</strong>
            </div>
            <div className="mini-card">
              <span>Scenario</span>
              <strong>{selectedScenario?.name ?? 'Nenhum scenario'}</strong>
            </div>
            <div className="mini-card">
              <span>Tela</span>
              <strong>{selectedScreen ? `@${selectedScreen.id}` : 'Nenhuma tela'}</strong>
            </div>
          </div>

          <div className="sidebar-block">
            <p className="sidebar-label">Marcadores</p>
            <div className="token-legend">
              {Object.entries(TOKEN_DEFINITIONS).map(([marker, meta]) => (
                <div key={marker} className="legend-row">
                  <span className={`token-chip ${meta.kind}`}>{marker}</span>
                  <small>{meta.label}</small>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="content-stage">
          {workspaceView === 'overview' ? (
            <div className="stage-grid overview-stage">
              <section className="panel stage-hero">
                <div className="panel-heading">
                  <div>
                    <p className="panel-kicker">UX Review</p>
                    <h2>O que mudou na experiencia</h2>
                  </div>
                </div>
                <div className="heuristic-grid">
                  {HEURISTIC_NOTES.map((item) => (
                    <article key={item.title} className="heuristic-card">
                      <strong>{item.title}</strong>
                      <p>{item.summary}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="panel-kicker">Jornadas</p>
                    <h2>Principais caminhos do usuario</h2>
                  </div>
                </div>
                <div className="journey-list">
                  {JOURNEYS.map((journey, index) => (
                    <article key={journey.title} className="journey-card">
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <div>
                        <strong>{journey.title}</strong>
                        <p>{journey.summary}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="panel-kicker">Quick Start</p>
                    <h2>Comece sem travar</h2>
                  </div>
                </div>
                <div className="quick-actions">
                  <button type="button" className="ghost-button" onClick={() => setWorkspaceView('builder')}>
                    Ir para o Builder
                  </button>
                  <button type="button" className="secondary-button" onClick={() => loadExample(DEFAULT_BDD)}>
                    Abrir exemplo pronto
                  </button>
                </div>
                <div className="snippet-grid">
                  {QUICK_SNIPPETS.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      className="snippet-card"
                      onClick={() => insertSnippet(item.snippet)}
                    >
                      <strong>{item.label}</strong>
                      <span>{item.help}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {workspaceView === 'builder' ? (
            <div className="stage-grid builder-stage">
              <section className="panel panel-tall">
                <div className="panel-heading">
                  <div>
                    <p className="panel-kicker">Step 1</p>
                    <h2>Escreva a feature</h2>
                  </div>
                  <button type="button" className="ghost-button" onClick={addScenario}>
                    Novo scenario
                  </button>
                </div>

                <div className="callout">
                  <strong>Como comecar</strong>
                  <p>
                    Use um `Given` com `@tela`, depois descreva `%formulario`, `#componentes` e a `!acao` principal.
                  </p>
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
                  <strong>Guia rapido</strong>
                  <p>
                    Escreva livremente em Gherkin. O ProtoFlow extrai `@`, `#`, `$`, `!`, `%` e `&` para montar o resto.
                  </p>
                  {parseError ? <p className="error-text">{parseError}</p> : null}
                </div>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="panel-kicker">Scenarios</p>
                    <h2>O que ja foi identificado</h2>
                  </div>
                </div>
                <div className="scenario-stack">
                  {model.scenarios.map((scenario) => (
                    <button
                      key={scenario.id}
                      type="button"
                      className={scenario.id === selectedScenario?.id ? 'scenario-select active' : 'scenario-select'}
                      onClick={() => setSelectedScenario(scenario.id)}
                    >
                      <strong>{scenario.name}</strong>
                      <span>@{scenario.startScreenId}</span>
                      <small>{buildScenarioSummary(scenario)}</small>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {workspaceView === 'flow' ? (
            <div className="stage-grid flow-stage">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="panel-kicker">Step 2</p>
                    <h2>Telas do fluxo</h2>
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
                      className={screen.id === selectedScreen?.id ? 'screen-node active' : 'screen-node'}
                      onClick={() => setSelectedScreen(screen.id)}
                    >
                      <strong>@{screen.id}</strong>
                      <span>{screen.components.length} componentes</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="panel panel-tall">
                <div className="panel-heading">
                  <div>
                    <p className="panel-kicker">Scenario ativo</p>
                    <h2>{selectedScenario?.name ?? 'Nenhum scenario'}</h2>
                  </div>
                </div>

                <div className="flow-path">
                  <div className="path-card">
                    <span>Origem</span>
                    <strong>@{selectedScenario?.startScreenId ?? '---'}</strong>
                  </div>
                  <div className="path-divider">→</div>
                  <div className="path-card">
                    <span>Modal</span>
                    <strong>{selectedScenario?.modalIds[0] ? `$${selectedScenario.modalIds[0]}` : 'Nenhum'}</strong>
                  </div>
                  <div className="path-divider">→</div>
                  <div className="path-card">
                    <span>Destino</span>
                    <strong>{selectedScenario?.destinationIds[0] ? `@${selectedScenario.destinationIds[0]}` : 'Nenhum'}</strong>
                  </div>
                </div>

                <div className="scenario-stack">
                  {model.scenarios.map((scenario) => (
                    <article
                      key={scenario.id}
                      className={scenario.id === selectedScenario?.id ? 'scenario-card selected' : 'scenario-card'}
                    >
                      <div className="scenario-card-head">
                        <strong>{scenario.name}</strong>
                        <button type="button" className="text-button" onClick={() => setSelectedScenario(scenario.id)}>
                          Focar
                        </button>
                      </div>
                      <p className="scenario-origin">Origem: @{scenario.startScreenId}</p>
                      <p className="scenario-summary">{buildScenarioSummary(scenario)}</p>
                    </article>
                  ))}
                </div>

                <div className="flow-actions">
                  <label className="field-stack">
                    <span>Adicionar navegacao</span>
                    <select defaultValue="" onChange={(event) => addDestination(event.target.value)}>
                      <option value="" disabled>
                        Escolha uma tela
                      </option>
                      {model.screens
                        .filter((screen) => screen.id !== selectedScenario?.startScreenId)
                        .map((screen) => (
                          <option key={screen.id} value={screen.id}>
                            @{screen.id}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button type="button" className="secondary-button" onClick={addModalToScenario}>
                    Adicionar modal
                  </button>
                  <button type="button" className="ghost-button" onClick={() => setWorkspaceView('prototype')}>
                    Testar no prototipo
                  </button>
                </div>
              </section>
            </div>
          ) : null}

          {workspaceView === 'prototype' ? (
            <div className="stage-grid prototype-stage">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="panel-kicker">Step 3</p>
                    <h2>Navegue pela tela</h2>
                  </div>
                </div>
                <div className="prototype-header">
                  <div>
                    <span className="device-pill">Screen</span>
                    <h3>@{selectedScreen?.id ?? 'Nenhuma tela'}</h3>
                  </div>
                  <p>{selectedScenario?.outcomeText ?? 'Sem scenario associado ainda.'}</p>
                </div>
                <div className="prototype-canvas">
                  {selectedScreen?.components.length ? (
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
                      <p>Adicione componentes na coluna ao lado.</p>
                    </div>
                  )}

                  {scenariosForSelectedScreen.flatMap((scenario) =>
                    scenario.modalIds.map((modalId) => (
                      <div key={modalId} className="modal-preview">
                        <strong>${modalId}</strong>
                        <p>Modal derivado do fluxo.</p>
                      </div>
                    )),
                  )}
                </div>

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
              </section>

              <section className="panel panel-tall">
                <div className="panel-heading">
                  <div>
                    <p className="panel-kicker">Inspector</p>
                    <h2>Monte a tela atual</h2>
                  </div>
                </div>

                <div className="subpanel">
                  <h3>Biblioteca</h3>
                  <p className="subtle-text">
                    Adicione blocos genericos. Tudo alimenta a mesma estrutura de dados do builder e do fluxo.
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
                  {selectedScreen?.components.length ? (
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
                    <p className="subtle-text">Nenhum componente nessa tela ainda.</p>
                  )}
                </div>
              </section>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}

export default App
