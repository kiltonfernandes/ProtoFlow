import { useMemo, useState } from 'react'
import './App.css'

const COMPONENT_LIBRARY = [
  { type: 'form', label: 'Formulario', category: 'Estrutura' },
  { type: 'input', label: 'Input', category: 'Campos' },
  { type: 'password', label: 'Password', category: 'Campos' },
  { type: 'textarea', label: 'Textarea', category: 'Campos' },
  { type: 'select', label: 'Select', category: 'Campos' },
  { type: 'checkbox', label: 'Checkbox', category: 'Campos' },
  { type: 'button', label: 'Button', category: 'Acoes' },
  { type: 'button-group', label: 'Button Group', category: 'Acoes' },
  { type: 'tabs', label: 'Tabs', category: 'Navegacao' },
  { type: 'table', label: 'Data Table', category: 'Dados' },
  { type: 'card', label: 'Card', category: 'Blocos' },
  { type: 'modal', label: 'Modal', category: 'Blocos' },
  { type: 'alert', label: 'Alert', category: 'Feedback' },
  { type: 'toast', label: 'Toast', category: 'Feedback' },
]

const DEFAULT_BDD = `Feature: Product Management

Scenario: Criar produto
Given que eu estou em @telacriarproduto
And vejo o %formularioproduto
And vejo os componentes #nomeproduto, #sku, #categoria, #preco
And vejo a acao !salvarproduto
When eu executo !salvarproduto com dados validos
Then o sistema cadastra o produto
And o sistema me apresenta $modalprodutocriado
And o sistema me leva para @telalistaprodutos

Scenario: Editar produto
Given que eu estou em @teladetalheproduto
And vejo o %formularioedicao
And vejo os componentes #nomeproduto, #descricao, #status, #preco
And vejo a acao !atualizarproduto
When eu executo !atualizarproduto com dados validos
Then o sistema atualiza o produto
And o sistema me apresenta $modalprodutoatualizado
And o sistema me leva para @teladetalheproduto
`

const BLANK_BDD = `Feature: Nova Feature

Scenario: Novo fluxo
Given que eu estou em @novatela
And vejo o %formularioprincipal
And vejo os componentes #campoprincipal
And vejo a acao !continuar
When eu executo !continuar
Then o sistema responde corretamente
`

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
  return {
    featureName,
    scenarios,
    screens,
    selectedScreenId: screens[0]?.id ?? '',
    selectedScenarioId: scenarios[0]?.id ?? '',
  }
}

function serializeBDD(model) {
  const lines = [`Feature: ${model.featureName}`, '']

  model.scenarios.forEach((scenario) => {
    const screen = model.screens.find((item) => item.id === scenario.startScreenId)
    const components = screen?.components ?? []
    lines.push(`Scenario: ${scenario.name}`)
    lines.push(`Given que eu estou em @${scenario.startScreenId}`)

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

function createProjectFromBDD(name, description, bddText) {
  const parsed = parseBDD(bddText)
  return {
    id: `${slugifyToken(name)}-${Date.now()}`,
    name,
    description,
    status: 'Draft',
    updatedAt: new Date().toISOString(),
    changelog: [
      {
        id: `entry-${Date.now()}`,
        title: 'Projeto criado',
        note: 'Estrutura inicial do projeto criada no ProtoFlow.',
        date: new Date().toLocaleDateString('pt-BR'),
      },
    ],
    gherkinDraft: bddText,
    model: parsed,
  }
}

function renderPrototypeComponent(component) {
  switch (component.type) {
    case 'form':
      return (
        <div className="form-shell">
          <strong>{component.label}</strong>
          <p>Formulario principal do fluxo.</p>
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
          <span>Detalhes</span>
          <span>Historico</span>
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
  const [projects, setProjects] = useState(() => [
    createProjectFromBDD(
      'Catalog Core',
      'Fluxos de cadastro e manutencao de produtos.',
      DEFAULT_BDD,
    ),
  ])
  const [appView, setAppView] = useState('landing')
  const [activeProjectId, setActiveProjectId] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [parseError, setParseError] = useState('')
  const [changelogDraft, setChangelogDraft] = useState('')

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [projects, activeProjectId],
  )

  const selectedScenario = useMemo(
    () =>
      activeProject?.model.scenarios.find(
        (scenario) => scenario.id === activeProject.model.selectedScenarioId,
      ) ?? activeProject?.model.scenarios[0],
    [activeProject],
  )

  const selectedScreen = useMemo(
    () =>
      activeProject?.model.screens.find((screen) => screen.id === activeProject.model.selectedScreenId) ??
      activeProject?.model.screens[0],
    [activeProject],
  )

  const scenariosForSelectedScreen = useMemo(
    () =>
      activeProject?.model.scenarios.filter((scenario) => scenario.startScreenId === selectedScreen?.id) ?? [],
    [activeProject, selectedScreen],
  )

  const libraryByCategory = COMPONENT_LIBRARY.reduce((accumulator, item) => {
    accumulator[item.category] = accumulator[item.category] ?? []
    accumulator[item.category].push(item)
    return accumulator
  }, {})

  function updateProject(projectId, updater) {
    setProjects((currentProjects) =>
      currentProjects.map((project) => {
        if (project.id !== projectId) {
          return project
        }

        const nextProject = updater(project)
        return {
          ...nextProject,
          updatedAt: new Date().toISOString(),
        }
      }),
    )
  }

  function syncProjectModel(projectId, nextModel, note) {
    updateProject(projectId, (project) => ({
      ...project,
      gherkinDraft: serializeBDD(nextModel),
      model: nextModel,
      changelog: note
        ? [
            {
              id: `entry-${Date.now()}`,
              title: note,
              note: 'Mudanca sincronizada automaticamente entre abas.',
              date: new Date().toLocaleDateString('pt-BR'),
            },
            ...project.changelog,
          ]
        : project.changelog,
    }))
  }

  function openProject(projectId) {
    setActiveProjectId(projectId)
    setAppView('workspace')
    setActiveTab('overview')
    setParseError('')
  }

  function createNewProject() {
    const name = newProjectName.trim() || `Projeto ${projects.length + 1}`
    const description = newProjectDescription.trim() || 'Novo workspace de produto.'
    const project = createProjectFromBDD(name, description, BLANK_BDD)
    setProjects((current) => [project, ...current])
    setNewProjectName('')
    setNewProjectDescription('')
    openProject(project.id)
  }

  function updateGherkin(value) {
    if (!activeProject) {
      return
    }

    updateProject(activeProject.id, (project) => ({
      ...project,
      gherkinDraft: value,
    }))

    try {
      const parsed = parseBDD(value)
      updateProject(activeProject.id, (project) => ({
        ...project,
        model: {
          ...parsed,
          selectedScreenId:
            project.model.selectedScreenId &&
            parsed.screens.some((screen) => screen.id === project.model.selectedScreenId)
              ? project.model.selectedScreenId
              : parsed.selectedScreenId,
          selectedScenarioId:
            project.model.selectedScenarioId &&
            parsed.scenarios.some((scenario) => scenario.id === project.model.selectedScenarioId)
              ? project.model.selectedScenarioId
              : parsed.selectedScenarioId,
        },
      }))
      setParseError('')
    } catch {
      setParseError('Nao foi possivel interpretar o Gherkin. Revise a estrutura da feature.')
    }
  }

  function updateProjectMeta(field, value) {
    if (!activeProject) {
      return
    }

    updateProject(activeProject.id, (project) => ({
      ...project,
      [field]: value,
    }))
  }

  function addChangelogEntry() {
    if (!activeProject || !changelogDraft.trim()) {
      return
    }

    updateProject(activeProject.id, (project) => ({
      ...project,
      changelog: [
        {
          id: `entry-${Date.now()}`,
          title: changelogDraft.trim(),
          note: `Registro manual na aba inicial do projeto ${project.name}.`,
          date: new Date().toLocaleDateString('pt-BR'),
        },
        ...project.changelog,
      ],
    }))
    setChangelogDraft('')
  }

  function setSelectedScenario(scenarioId) {
    if (!activeProject) {
      return
    }

    const scenario = activeProject.model.scenarios.find((item) => item.id === scenarioId)
    syncProjectModel(
      activeProject.id,
      {
        ...activeProject.model,
        selectedScenarioId: scenarioId,
        selectedScreenId: scenario?.startScreenId ?? activeProject.model.selectedScreenId,
      },
      '',
    )
  }

  function setSelectedScreen(screenId) {
    if (!activeProject) {
      return
    }

    const scenarioForScreen = activeProject.model.scenarios.find((scenario) => scenario.startScreenId === screenId)
    syncProjectModel(
      activeProject.id,
      {
        ...activeProject.model,
        selectedScreenId: screenId,
        selectedScenarioId: scenarioForScreen?.id ?? activeProject.model.selectedScenarioId,
      },
      '',
    )
  }

  function addScenario() {
    if (!activeProject) {
      return
    }

    const baseScreenId = selectedScreen?.id ?? `novatela${activeProject.model.screens.length + 1}`
    const nextScenario = {
      id: `scenario${Date.now()}`,
      name: `Novo fluxo ${activeProject.model.scenarios.length + 1}`,
      startScreenId: baseScreenId,
      startScreenLabel: titleFromToken(baseScreenId),
      components: [],
      forms: [],
      actions: [],
      modalIds: [],
      destinationIds: [],
      whenText: 'eu executo a acao principal',
      outcomeText: 'o sistema responde corretamente',
    }

    syncProjectModel(
      activeProject.id,
      {
        ...activeProject.model,
        scenarios: [...activeProject.model.scenarios, nextScenario],
        selectedScenarioId: nextScenario.id,
      },
      'Scenario criado',
    )
  }

  function addScreen() {
    if (!activeProject) {
      return
    }

    const id = `novatela${activeProject.model.screens.length + 1}`
    syncProjectModel(
      activeProject.id,
      {
        ...activeProject.model,
        screens: [
          ...activeProject.model.screens,
          {
            id,
            label: `Nova Tela ${activeProject.model.screens.length + 1}`,
            components: [],
          },
        ],
        selectedScreenId: id,
      },
      'Tela criada',
    )
  }

  function addDestination(destinationId) {
    if (!activeProject || !selectedScenario || !destinationId) {
      return
    }

    const nextScenarios = activeProject.model.scenarios.map((scenario) =>
      scenario.id === selectedScenario.id
        ? {
            ...scenario,
            destinationIds: [...new Set([...scenario.destinationIds, destinationId])],
          }
        : scenario,
    )

    syncProjectModel(
      activeProject.id,
      {
        ...activeProject.model,
        scenarios: nextScenarios,
      },
      'Fluxo atualizado',
    )
  }

  function addModal() {
    if (!activeProject || !selectedScenario) {
      return
    }

    const modalId = `modal${selectedScenario.modalIds.length + 1}${selectedScenario.startScreenId}`
    const nextScenarios = activeProject.model.scenarios.map((scenario) =>
      scenario.id === selectedScenario.id
        ? {
            ...scenario,
            modalIds: [...scenario.modalIds, modalId],
          }
        : scenario,
    )

    syncProjectModel(
      activeProject.id,
      {
        ...activeProject.model,
        scenarios: nextScenarios,
      },
      'Modal adicionado',
    )
  }

  function addComponent(template) {
    if (!activeProject || !selectedScreen) {
      return
    }

    const baseId = slugifyToken(`${template.type}${selectedScreen.components.length + 1}`)
    const nextScreens = activeProject.model.screens.map((screen) =>
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

    syncProjectModel(
      activeProject.id,
      {
        ...activeProject.model,
        screens: nextScreens,
      },
      'Componente adicionado',
    )
  }

  function updateComponentLabel(componentId, label) {
    if (!activeProject || !selectedScreen) {
      return
    }

    const nextScreens = activeProject.model.screens.map((screen) =>
      screen.id === selectedScreen.id
        ? {
            ...screen,
            components: screen.components.map((component) =>
              component.id === componentId ? { ...component, label } : component,
            ),
          }
        : screen,
    )

    syncProjectModel(
      activeProject.id,
      {
        ...activeProject.model,
        screens: nextScreens,
      },
      'Componente renomeado',
    )
  }

  function removeComponent(componentId) {
    if (!activeProject || !selectedScreen) {
      return
    }

    const nextScreens = activeProject.model.screens.map((screen) =>
      screen.id === selectedScreen.id
        ? {
            ...screen,
            components: screen.components.filter((component) => component.id !== componentId),
          }
        : screen,
    )

    syncProjectModel(
      activeProject.id,
      {
        ...activeProject.model,
        screens: nextScreens,
      },
      'Componente removido',
    )
  }

  const generatedReadme = activeProject
    ? `# ${activeProject.name}

${activeProject.description}

## Status
- ${activeProject.status}

## Feature principal
- ${activeProject.model.featureName}

## Changelog
${activeProject.changelog.map((entry) => `- ${entry.date} - ${entry.title}`).join('\n')}`
    : ''

  return (
    <div className="app-shell">
      {appView === 'landing' ? (
        <section className="landing-shell">
          <div className="landing-copy">
            <p className="eyebrow">ProtoFlow</p>
            <h1>Transforme BDD em projetos, jornadas e prototipos vivos</h1>
            <p>
              Uma workspace unica para organizar README, changelog, fluxo, Gherkin e prototipos sem quebrar a sincronizacao entre eles.
            </p>
            <div className="hero-actions">
              <button type="button" className="ghost-button" onClick={() => setAppView('home')}>
                Iniciar
              </button>
            </div>
          </div>
          <div className="landing-card">
            <div className="landing-preview-window">
              <div className="preview-chip">Projetos</div>
              <strong>Catalog Core</strong>
              <p>README, fluxo, Gherkin e prototipo ligados no mesmo modelo.</p>
              <div className="preview-stats">
                <span>4 abas</span>
                <span>CRUD sincronizado</span>
                <span>Deployavel</span>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {appView === 'home' ? (
        <section className="home-shell">
          <header className="home-header panel">
            <div>
              <p className="eyebrow">Workspace</p>
              <h1>Seus projetos ativos</h1>
              <p>Abra um projeto existente ou comece um novo para modelar o produto.</p>
            </div>
            <button type="button" className="secondary-button" onClick={() => setAppView('landing')}>
              Voltar
            </button>
          </header>

          <div className="home-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">Projetos</p>
                  <h2>Em andamento</h2>
                </div>
              </div>
              <div className="project-list">
                {projects.map((project) => (
                  <article key={project.id} className="project-card">
                    <div>
                      <strong>{project.name}</strong>
                      <p>{project.description}</p>
                    </div>
                    <div className="project-meta">
                      <span>{project.status}</span>
                      <small>{new Date(project.updatedAt).toLocaleDateString('pt-BR')}</small>
                    </div>
                    <button type="button" className="ghost-button" onClick={() => openProject(project.id)}>
                      Abrir projeto
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">Novo projeto</p>
                  <h2>Criar workspace</h2>
                </div>
              </div>
              <label className="field-stack">
                <span>Nome do projeto</span>
                <input value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} />
              </label>
              <label className="field-stack">
                <span>Descricao</span>
                <textarea
                  rows="5"
                  value={newProjectDescription}
                  onChange={(event) => setNewProjectDescription(event.target.value)}
                />
              </label>
              <button type="button" className="ghost-button" onClick={createNewProject}>
                Comecar novo projeto
              </button>
            </section>
          </div>
        </section>
      ) : null}

      {appView === 'workspace' && activeProject ? (
        <section className="workspace-shell">
          <header className="workspace-header panel">
            <div>
              <p className="eyebrow">Projeto ativo</p>
              <h1>{activeProject.name}</h1>
              <p>{activeProject.description}</p>
            </div>
            <div className="workspace-header-actions">
              <span className="status-pill">{activeProject.status}</span>
              <button type="button" className="secondary-button" onClick={() => setAppView('home')}>
                Projetos
              </button>
            </div>
          </header>

          <nav className="tabbar panel">
            {[
              { id: 'overview', label: 'Pagina inicial' },
              { id: 'flow', label: 'Fluxo' },
              { id: 'gherkin', label: 'Gherkin' },
              { id: 'prototype', label: 'Prototipos' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? 'tab-button active' : 'tab-button'}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {activeTab === 'overview' ? (
            <div className="workspace-grid">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="panel-kicker">README</p>
                    <h2>Informacoes do projeto</h2>
                  </div>
                </div>
                <label className="field-stack">
                  <span>Nome</span>
                  <input value={activeProject.name} onChange={(event) => updateProjectMeta('name', event.target.value)} />
                </label>
                <label className="field-stack">
                  <span>Descricao</span>
                  <textarea
                    rows="5"
                    value={activeProject.description}
                    onChange={(event) => updateProjectMeta('description', event.target.value)}
                  />
                </label>
                <label className="field-stack">
                  <span>Status</span>
                  <select value={activeProject.status} onChange={(event) => updateProjectMeta('status', event.target.value)}>
                    <option>Draft</option>
                    <option>In Progress</option>
                    <option>Review</option>
                    <option>Ready</option>
                  </select>
                </label>
                <div className="callout">
                  <strong>Sync automatico</strong>
                  <p>O nome da feature, o changelog e as mudancas das outras abas aparecem aqui automaticamente.</p>
                </div>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="panel-kicker">Changelog</p>
                    <h2>Historico do projeto</h2>
                  </div>
                </div>
                <div className="changelog-form">
                  <input
                    value={changelogDraft}
                    onChange={(event) => setChangelogDraft(event.target.value)}
                    placeholder="Ex.: adicionada jornada de edicao de produto"
                  />
                  <button type="button" className="ghost-button" onClick={addChangelogEntry}>
                    Adicionar entrada
                  </button>
                </div>
                <div className="changelog-list">
                  {activeProject.changelog.map((entry) => (
                    <article key={entry.id} className="changelog-card">
                      <strong>{entry.title}</strong>
                      <span>{entry.date}</span>
                      <p>{entry.note}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="panel readme-preview-panel">
                <div className="panel-heading">
                  <div>
                    <p className="panel-kicker">Preview</p>
                    <h2>README gerado</h2>
                  </div>
                </div>
                <pre className="readme-preview">{generatedReadme}</pre>
              </section>
            </div>
          ) : null}

          {activeTab === 'flow' ? (
            <div className="workspace-grid">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="panel-kicker">Scenarios</p>
                    <h2>Jornadas</h2>
                  </div>
                  <button type="button" className="ghost-button" onClick={addScenario}>
                    Novo scenario
                  </button>
                </div>
                <div className="scenario-stack">
                  {activeProject.model.scenarios.map((scenario) => (
                    <button
                      key={scenario.id}
                      type="button"
                      className={scenario.id === selectedScenario?.id ? 'scenario-select active' : 'scenario-select'}
                      onClick={() => setSelectedScenario(scenario.id)}
                    >
                      <strong>{scenario.name}</strong>
                      <span>@{scenario.startScreenId}</span>
                      <small>{scenario.destinationIds.length} destinos</small>
                    </button>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="panel-kicker">Fluxo</p>
                    <h2>Mapa da jornada</h2>
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
                <div className="flow-actions">
                  <button type="button" className="secondary-button" onClick={addScreen}>
                    Nova tela
                  </button>
                  <button type="button" className="secondary-button" onClick={addModal}>
                    Adicionar modal
                  </button>
                  <select defaultValue="" onChange={(event) => addDestination(event.target.value)}>
                    <option value="" disabled>
                      Adicionar destino
                    </option>
                    {activeProject.model.screens
                      .filter((screen) => screen.id !== selectedScenario?.startScreenId)
                      .map((screen) => (
                        <option key={screen.id} value={screen.id}>
                          @{screen.id}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="screen-list">
                  {activeProject.model.screens.map((screen) => (
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
            </div>
          ) : null}

          {activeTab === 'gherkin' ? (
            <div className="workspace-grid">
              <section className="panel editor-panel">
                <div className="panel-heading">
                  <div>
                    <p className="panel-kicker">BDD</p>
                    <h2>Gerencie o Gherkin</h2>
                  </div>
                  <button type="button" className="ghost-button" onClick={addScenario}>
                    Novo scenario
                  </button>
                </div>
                <textarea
                  className="bdd-editor"
                  value={activeProject.gherkinDraft}
                  onChange={(event) => updateGherkin(event.target.value)}
                  spellCheck="false"
                />
                <div className="hint-box">
                  <strong>Convencoes</strong>
                  <p>Use `@tela`, `%formulario`, `#componente`, `!acao` e `$modal`.</p>
                  {parseError ? <p className="error-text">{parseError}</p> : null}
                </div>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="panel-kicker">Impacto</p>
                    <h2>O que esse BDD esta gerando</h2>
                  </div>
                </div>
                <div className="metric-grid">
                  <div className="mini-card">
                    <span>Feature</span>
                    <strong>{activeProject.model.featureName}</strong>
                  </div>
                  <div className="mini-card">
                    <span>Telas</span>
                    <strong>{activeProject.model.screens.length}</strong>
                  </div>
                  <div className="mini-card">
                    <span>Scenarios</span>
                    <strong>{activeProject.model.scenarios.length}</strong>
                  </div>
                </div>
                <div className="scenario-stack">
                  {activeProject.model.scenarios.map((scenario) => (
                    <article key={scenario.id} className="scenario-card">
                      <strong>{scenario.name}</strong>
                      <p>{scenario.outcomeText}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === 'prototype' ? (
            <div className="workspace-grid prototype-grid">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="panel-kicker">Tela ativa</p>
                    <h2>@{selectedScreen?.id ?? 'Nenhuma tela'}</h2>
                  </div>
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
                      <p>Adicione componentes no inspector.</p>
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

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="panel-kicker">Inspector</p>
                    <h2>CRUD do prototipo</h2>
                  </div>
                </div>
                <div className="subpanel">
                  <h3>Biblioteca</h3>
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
      ) : null}
    </div>
  )
}

export default App
