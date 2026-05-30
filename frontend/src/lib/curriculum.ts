export interface CurriculumPhase {
  id: number
  title: string
  range: string
  goal: string
  articleCount: number
}

export interface CurriculumArticle {
  num: number
  phase: number
  phaseTitle: string
  phaseRange: string
  phaseGoal: string
  title: string
  goal: string
  milestone: boolean
  treePath: string[]
  treePosition: string
  treeDepth: number
  branchTitle: string
  parentNode: string
  currentNode: string
  childNodes: string[]
  layerRole: string
}

export interface CurriculumMindMapNode {
  id: string
  title: string
  summary?: string
  range: string
  articleNums: number[]
  children?: CurriculumMindMapNode[]
}

export interface PlanArticleLike {
  num: number
  title: string
  full_title?: string
  goal?: string
  tree_position?: string
  tree_position_detail?: {
    path?: string
    layer_role?: string
    parent?: string
    children?: string
  }
  key_points?: string[]
  next_hook?: string
}

export interface BuiltCurriculum {
  phases: CurriculumPhase[]
  articles: CurriculumArticle[]
  mindMap: CurriculumMindMapNode[]
}

function formatRange(nums: number[]) {
  if (!nums.length) return '---'
  const sorted = [...nums].sort((a, b) => a - b)
  const first = String(sorted[0]).padStart(3, '0')
  const last = String(sorted[sorted.length - 1]).padStart(3, '0')
  return first === last ? first : `${first}-${last}`
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'node'
}

function treeSegments(article: PlanArticleLike) {
  const rawPath = article.tree_position_detail?.path || article.tree_position || ''
  const segments = rawPath
    .split('>')
    .map((item) => item.trim())
    .filter(Boolean)
  return segments.length ? segments : ['Project plan', article.title]
}

export function buildCurriculumFromPlan(planArticles: PlanArticleLike[]): BuiltCurriculum {
  const sorted = [...planArticles].sort((a, b) => a.num - b.num)
  if (!sorted.length) {
    return {
      phases: CURRICULUM_PHASES,
      articles: CURRICULUM_ARTICLES,
      mindMap: CURRICULUM_MIND_MAP,
    }
  }

  const rootOrder: string[] = []
  const rootToPhase = new Map<string, number>()
  for (const article of sorted) {
    const root = treeSegments(article)[0]
    if (!rootToPhase.has(root)) {
      rootOrder.push(root)
      rootToPhase.set(root, rootOrder.length)
    }
  }

  const phases = rootOrder.map((root, index) => {
    const nums = sorted
      .filter((article) => treeSegments(article)[0] === root)
      .map((article) => article.num)
    const firstArticle = sorted.find((article) => treeSegments(article)[0] === root)
    return {
      id: index + 1,
      title: `Phase ${index + 1}: ${root}`,
      range: formatRange(nums),
      goal: firstArticle?.goal || `Build the ${root} branch of this writing project.`,
      articleCount: nums.length,
    }
  })

  const articles = sorted.map((article, index) => {
    const segments = treeSegments(article)
    const root = segments[0]
    const phase = rootToPhase.get(root) || 1
    const phaseData = phases[phase - 1]
    const keyPoints = article.key_points || []
    const currentNode = segments[segments.length - 1] || article.title
    return {
      num: article.num,
      phase,
      phaseTitle: phaseData.title,
      phaseRange: phaseData.range,
      phaseGoal: phaseData.goal,
      title: article.title,
      goal: article.goal || article.next_hook || 'Clarify this article in the project plan.',
      milestone: index === 0 || index === sorted.length - 1,
      treePath: segments,
      treePosition: segments.join(' > '),
      treeDepth: Math.max(0, segments.length - 1),
      branchTitle: root,
      parentNode: segments.length > 1 ? segments[segments.length - 2] : root,
      currentNode,
      childNodes: keyPoints,
      layerRole: article.tree_position_detail?.layer_role || keyPoints[0] || article.next_hook || article.goal || currentNode,
    }
  })

  const mindMap = rootOrder.map((root) => {
    const rootArticles = articles.filter((article) => article.branchTitle === root)
    const childOrder: string[] = []
    const childGroups = new Map<string, CurriculumArticle[]>()
    for (const article of rootArticles) {
      const childName = article.treePath[1] || article.currentNode
      if (!childGroups.has(childName)) {
        childOrder.push(childName)
        childGroups.set(childName, [])
      }
      childGroups.get(childName)?.push(article)
    }

    return {
      id: slug(root),
      title: root,
      summary: rootArticles[0]?.phaseGoal,
      range: formatRange(rootArticles.map((article) => article.num)),
      articleNums: rootArticles.map((article) => article.num),
      children: childOrder.map((childName) => {
        const childArticles = childGroups.get(childName) || []
        return {
          id: `${slug(root)}-${slug(childName)}`,
          title: childName,
          summary: childArticles[0]?.goal,
          range: formatRange(childArticles.map((article) => article.num)),
          articleNums: childArticles.map((article) => article.num),
          children: childArticles
            .filter((article) => article.treePath.length > 2)
            .map((article) => ({
              id: `${slug(root)}-${slug(childName)}-${article.num}`,
              title: article.currentNode,
              range: String(article.num).padStart(3, '0'),
              articleNums: [article.num],
            })),
        }
      }),
    }
  })

  return { phases, articles, mindMap }
}

export const CURRICULUM_PHASES: CurriculumPhase[] = [
  {
    id: 1,
    title: 'Phase 1: Define the project',
    range: '001-003',
    goal: 'Clarify the audience, promise, and core workflow before drafting.',
    articleCount: 3,
  },
  {
    id: 2,
    title: 'Phase 2: Write and refine',
    range: '004-006',
    goal: 'Draft concrete articles, collect feedback, and turn the workflow into a repeatable system.',
    articleCount: 3,
  },
]

export const CURRICULUM_ARTICLES: CurriculumArticle[] = [
  {
    num: 1,
    phase: 1,
    phaseTitle: CURRICULUM_PHASES[0].title,
    phaseRange: CURRICULUM_PHASES[0].range,
    phaseGoal: CURRICULUM_PHASES[0].goal,
    title: 'The orientation article',
    goal: 'Establish the map for the whole writing project.',
    milestone: true,
    treePath: ['Foundation', 'Orientation'],
    treePosition: 'Foundation > Orientation',
    treeDepth: 1,
    branchTitle: 'Foundation',
    parentNode: 'Foundation',
    currentNode: 'Orientation',
    childNodes: ['Workflow', 'Examples'],
    layerRole: 'Set reader expectations and define the project promise.',
  },
  {
    num: 2,
    phase: 1,
    phaseTitle: CURRICULUM_PHASES[0].title,
    phaseRange: CURRICULUM_PHASES[0].range,
    phaseGoal: CURRICULUM_PHASES[0].goal,
    title: 'The core workflow',
    goal: 'Explain the workflow readers will use throughout the series.',
    milestone: false,
    treePath: ['Foundation', 'Workflow'],
    treePosition: 'Foundation > Workflow',
    treeDepth: 1,
    branchTitle: 'Foundation',
    parentNode: 'Foundation',
    currentNode: 'Workflow',
    childNodes: ['Inputs', 'Process', 'Outputs', 'Feedback'],
    layerRole: 'Convert the project promise into a usable operating model.',
  },
  {
    num: 3,
    phase: 1,
    phaseTitle: CURRICULUM_PHASES[0].title,
    phaseRange: CURRICULUM_PHASES[0].range,
    phaseGoal: CURRICULUM_PHASES[0].goal,
    title: 'The first concrete example',
    goal: 'Show the workflow in a real situation instead of only describing it.',
    milestone: false,
    treePath: ['Foundation', 'Example'],
    treePosition: 'Foundation > Example',
    treeDepth: 1,
    branchTitle: 'Foundation',
    parentNode: 'Foundation',
    currentNode: 'Example',
    childNodes: ['Evidence', 'Decision', 'Revision'],
    layerRole: 'Help readers trust the method through a grounded example.',
  },
  {
    num: 4,
    phase: 2,
    phaseTitle: CURRICULUM_PHASES[1].title,
    phaseRange: CURRICULUM_PHASES[1].range,
    phaseGoal: CURRICULUM_PHASES[1].goal,
    title: 'Common failure modes',
    goal: 'Explain where the workflow usually breaks and how to notice it early.',
    milestone: false,
    treePath: ['Refinement', 'Failure modes'],
    treePosition: 'Refinement > Failure modes',
    treeDepth: 1,
    branchTitle: 'Refinement',
    parentNode: 'Refinement',
    currentNode: 'Failure modes',
    childNodes: ['Vague goals', 'Weak structure', 'No feedback'],
    layerRole: 'Turn mistakes into a practical checklist.',
  },
  {
    num: 5,
    phase: 2,
    phaseTitle: CURRICULUM_PHASES[1].title,
    phaseRange: CURRICULUM_PHASES[1].range,
    phaseGoal: CURRICULUM_PHASES[1].goal,
    title: 'Feedback and revision',
    goal: 'Show how agent feedback and human judgment work together.',
    milestone: false,
    treePath: ['Refinement', 'Feedback'],
    treePosition: 'Refinement > Feedback',
    treeDepth: 1,
    branchTitle: 'Refinement',
    parentNode: 'Refinement',
    currentNode: 'Feedback',
    childNodes: ['Reader simulation', 'Fact check', 'Final edit'],
    layerRole: 'Demonstrate multi-agent collaboration as a writing method.',
  },
  {
    num: 6,
    phase: 2,
    phaseTitle: CURRICULUM_PHASES[1].title,
    phaseRange: CURRICULUM_PHASES[1].range,
    phaseGoal: CURRICULUM_PHASES[1].goal,
    title: 'Make the system repeatable',
    goal: 'Turn the project into a reusable writing operating system.',
    milestone: true,
    treePath: ['Refinement', 'Operating system'],
    treePosition: 'Refinement > Operating system',
    treeDepth: 1,
    branchTitle: 'Refinement',
    parentNode: 'Refinement',
    currentNode: 'Operating system',
    childNodes: ['Templates', 'Metrics', 'Publishing ritual'],
    layerRole: 'Close the sample project and prepare users to import or generate their own plan.',
  },
]

export const CURRICULUM_MIND_MAP: CurriculumMindMapNode[] = [
  {
    id: 'foundation',
    title: 'Foundation',
    summary: 'Define the audience, promise, and workflow.',
    range: '001-003',
    articleNums: [1, 2, 3],
    children: [
      { id: 'orientation', title: 'Orientation', range: '001', articleNums: [1] },
      { id: 'workflow', title: 'Workflow', range: '002', articleNums: [2] },
      { id: 'example', title: 'Example', range: '003', articleNums: [3] },
    ],
  },
  {
    id: 'refinement',
    title: 'Refinement',
    summary: 'Use feedback to make the writing system repeatable.',
    range: '004-006',
    articleNums: [4, 5, 6],
    children: [
      { id: 'failure-modes', title: 'Failure modes', range: '004', articleNums: [4] },
      { id: 'feedback', title: 'Feedback', range: '005', articleNums: [5] },
      { id: 'operating-system', title: 'Operating system', range: '006', articleNums: [6] },
    ],
  },
]
