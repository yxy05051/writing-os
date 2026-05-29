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
