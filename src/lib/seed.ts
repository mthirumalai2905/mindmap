import { emptyWorkspaceData, make } from "./factories";
import { tidyLayout } from "./layout";
import type {
  CollectionKey,
  ContentType,
  ID,
  MapNode,
  NodeKind,
  Product,
  Status,
  WorkspaceData,
} from "./types";
import { addDays } from "date-fns";
import { nowIso, toDay, uid } from "./utils";

/* ------------------------------------------------------------------ */
/* Template definition. Descriptions restate the brief; nothing here   */
/* claims shipped capabilities, dates, partners or customers.          */
/* ------------------------------------------------------------------ */

interface ProductTemplate {
  slug: string;
  name: string;
  kind: Product["kind"];
  url: string;
  tagline: string;
  description: string;
  goals: string[];
  researchQuestions: string[];
  categories: string[];
  /** Categories that get a branch on the master map. */
  mapCategories: string[];
}

export const ECOSYSTEM_TEMPLATE: ProductTemplate[] = [
  {
    slug: "real-time-web",
    name: "Real Time Web",
    kind: "product",
    url: "https://realtimeweb.org",
    tagline: "The vision for a decentralized, real-time internet.",
    description:
      "The broader vision for a decentralized, real-time internet. Also serves as a Wikipedia-like knowledge resource.",
    goals: [
      "Explain the vision and principles clearly to newcomers",
      "Build an evergreen knowledge base distinct from company news",
    ],
    researchQuestions: [
      "How should community contributions be reviewed and attributed?",
      "Which concepts need a glossary entry before longer explainers?",
    ],
    categories: [
      "Vision and principles",
      "Internet infrastructure and decentralized systems",
      "Technical concepts and explainers",
      "Glossary and FAQs",
      "Architecture and research",
      "Educational articles",
      "Technical documentation",
      "Community contributions",
      "Editorial updates",
    ],
    mapCategories: ["Vision and principles", "Educational articles", "Glossary and FAQs", "Editorial updates"],
  },
  {
    slug: "synx-tools",
    name: "Synx Tools",
    kind: "product",
    url: "https://synx.tools",
    tagline: "Tools and infrastructure supporting the ecosystem.",
    description: "Tools and infrastructure supporting the ecosystem.",
    goals: ["Give developers a clear path from first visit to first integration"],
    researchQuestions: ["Which integration guides are requested most often?"],
    categories: [
      "Product documentation",
      "Technical architecture",
      "Tutorials and implementation guides",
      "Developer resources",
      "Product updates and release notes",
      "Use cases and demonstrations",
      "Integration guides",
      "Research and technical proposals",
      "Security and identity documentation",
    ],
    mapCategories: [
      "Product documentation",
      "Security and identity documentation",
      "Tutorials and implementation guides",
      "Product updates and release notes",
    ],
  },
  {
    slug: "skalle-ai",
    name: "Skalle AI",
    kind: "product",
    url: "https://skalle.ai",
    tagline: "An AI-oriented product focused on workflows, services, and execution.",
    description:
      "An AI-oriented product focused on workflows, services, and execution. Its fictional comic universe is planned separately from real product documentation.",
    goals: [
      "Describe actual product capabilities accurately",
      "Develop the fictional universe as a distinct creative track",
    ],
    researchQuestions: ["How should fictional lore reference the real product without implying capabilities?"],
    categories: [
      "Product overview and positioning",
      "Product documentation",
      "AI agents and workflow research",
      "Technical architecture",
      "Demonstrations and use cases",
      "Tutorials and developer guides",
      "Product announcements",
      "Research and experiments",
      "PR campaigns",
      "Comic universe",
      "Visual storytelling and creative campaigns",
    ],
    mapCategories: ["Product overview and positioning", "AI agents and workflow research", "Comic universe", "PR campaigns"],
  },
  {
    slug: "morph-space",
    name: "Morph Space",
    kind: "product",
    url: "",
    tagline: "A connected environment for people, AI agents, machines, and services.",
    description:
      "A connected environment where people, AI agents, machines, and services can discover and use capabilities and resources.",
    goals: ["Define the core concepts before writing platform documentation"],
    researchQuestions: ["What should identity and permissions mean for non-human participants?"],
    categories: [
      "Platform documentation",
      "Service discovery",
      "Agent and service interactions",
      "Identity, access, and permissions",
      "Marketplace and monetization concepts",
      "Tutorials and use cases",
      "Architecture and research",
      "Product updates",
    ],
    mapCategories: ["Service discovery", "Identity, access, and permissions", "Marketplace and monetization concepts"],
  },
  {
    slug: "cross-ecosystem",
    name: "Cross-Ecosystem Strategy",
    kind: "initiative",
    url: "",
    tagline: "Initiatives that support multiple products.",
    description: "PR, brand, launches, community, partnerships and other initiatives spanning the ecosystem.",
    goals: ["Keep messaging consistent across all four products"],
    researchQuestions: ["How should launches be sequenced across products?"],
    categories: [
      "PR and media outreach",
      "Brand strategy",
      "Founder thought leadership",
      "Social media",
      "Product launches",
      "Community building",
      "Investor communications",
      "Open-source initiatives",
      "Partnerships",
      "Events and campaigns",
    ],
    mapCategories: ["Product launches", "Founder thought leadership", "Open-source initiatives", "Community building"],
  },
  {
    slug: "future-research",
    name: "Future Research",
    kind: "initiative",
    url: "",
    tagline: "Future technology research and experimental product ideas.",
    description: "Future technology research and experimental product ideas, tracked with explicit evidence levels.",
    goals: ["Turn open questions into testable hypotheses"],
    researchQuestions: [],
    categories: ["Agents and services", "Experiments", "Future technology research"],
    mapCategories: ["Agents and services", "Experiments"],
  },
];

/* ------------------------------------------------------------------ */

interface ExampleLeaf {
  product: string;
  category: string;
  title: string;
  description: string;
  kind: NodeKind;
  contentType?: ContentType;
  status?: Status;
  /** Also create a content library record linked to this node. */
  content?: {
    nature?: "evergreen" | "news" | "internal";
    dueInDays?: number;
    priority?: "urgent" | "high" | "medium" | "low";
    audience?: string;
    objective?: string;
  };
}

const EXAMPLE_LEAVES: ExampleLeaf[] = [
  {
    product: "real-time-web",
    category: "Vision and principles",
    title: "What Is a Real-Time Web?",
    description: "A foundational explainer introducing the idea of a decentralized, real-time internet for a general audience.",
    kind: "content",
    contentType: "article",
    status: "drafting",
    content: {
      nature: "evergreen",
      dueInDays: 9,
      priority: "high",
      audience: "Newcomers to the ecosystem",
      objective: "Give readers a shared starting point for every other RTW article.",
    },
  },
  {
    product: "real-time-web",
    category: "Vision and principles",
    title: "Principles of the Real-Time Web",
    description: "Draft the principles the vision rests on before publishing deeper material.",
    kind: "idea",
    status: "idea",
  },
  {
    product: "real-time-web",
    category: "Educational articles",
    title: "Decentralized Internet Architecture",
    description: "An educational overview of decentralized architecture concepts relevant to the vision.",
    kind: "content",
    contentType: "article",
    status: "researching",
    content: { nature: "evergreen", priority: "medium", audience: "Technical readers" },
  },
  {
    product: "real-time-web",
    category: "Glossary and FAQs",
    title: "Core glossary: foundational terms",
    description: "Short, linkable definitions for terms used across RTW articles.",
    kind: "content",
    contentType: "glossary",
    status: "planned",
    content: { nature: "evergreen", priority: "medium" },
  },
  {
    product: "real-time-web",
    category: "Editorial updates",
    title: "Editorial guideline: evergreen vs. news",
    description: "Decide how knowledge articles and company news are separated on the site.",
    kind: "note",
    status: "idea",
  },
  {
    product: "synx-tools",
    category: "Product documentation",
    title: "Developer Getting Started Guide",
    description: "The first guide a developer reads. Scope depends on what is actually available to developers today.",
    kind: "content",
    contentType: "tutorial",
    status: "planned",
    content: { nature: "evergreen", dueInDays: 21, priority: "high", audience: "Developers" },
  },
  {
    product: "synx-tools",
    category: "Security and identity documentation",
    title: "Identity and Access Architecture",
    description: "Document the identity and access design. Requires source notes from engineering before drafting.",
    kind: "content",
    contentType: "documentation",
    status: "researching",
    content: { nature: "evergreen", priority: "high", audience: "Developers and security reviewers" },
  },
  {
    product: "synx-tools",
    category: "Tutorials and implementation guides",
    title: "Integration guide template",
    description: "A reusable outline so every integration guide follows the same structure.",
    kind: "idea",
    status: "idea",
  },
  {
    product: "synx-tools",
    category: "Product updates and release notes",
    title: "Release notes format",
    description: "Agree on a format and cadence for release notes.",
    kind: "idea",
    status: "idea",
  },
  {
    product: "skalle-ai",
    category: "Product overview and positioning",
    title: "Skalle Product Overview",
    description: "Positioning and overview page. Must describe only capabilities that exist.",
    kind: "content",
    contentType: "documentation",
    status: "drafting",
    content: { nature: "evergreen", dueInDays: 14, priority: "high", objective: "Explain what Skalle AI does today." },
  },
  {
    product: "skalle-ai",
    category: "AI agents and workflow research",
    title: "AI Workflow Demonstration",
    description: "A recorded walkthrough of a real workflow. Script once the demo scenario is confirmed.",
    kind: "content",
    contentType: "video",
    status: "idea",
    content: { nature: "news", priority: "medium" },
  },
  {
    product: "skalle-ai",
    category: "Comic universe",
    title: "Origin Story — Comic Issue 1",
    description: "The first comic issue of the Skalle fictional universe. Fiction — not product documentation.",
    kind: "content",
    contentType: "comic_issue",
    status: "planned",
    content: { nature: "internal", priority: "medium" },
  },
  {
    product: "skalle-ai",
    category: "PR campaigns",
    title: "Positioning narrative for press",
    description: "A short narrative the team can use consistently in press conversations.",
    kind: "initiative",
    status: "idea",
  },
  {
    product: "morph-space",
    category: "Service discovery",
    title: "Service Discovery Concept",
    description: "Concept paper describing how participants could discover capabilities and resources.",
    kind: "content",
    contentType: "research_paper",
    status: "researching",
    content: { nature: "internal", priority: "high" },
  },
  {
    product: "morph-space",
    category: "Identity, access, and permissions",
    title: "Permissions for people, agents and services",
    description: "Open question: how permissions differ when the actor is an agent or machine.",
    kind: "research",
    status: "idea",
  },
  {
    product: "morph-space",
    category: "Marketplace and monetization concepts",
    title: "Monetization concept questions",
    description: "List the questions a marketplace model would need to answer.",
    kind: "idea",
    status: "idea",
  },
  {
    product: "cross-ecosystem",
    category: "Product launches",
    title: "Product Launch Communications Plan",
    description: "A shared plan for announcing launches across products. No launch dates are set.",
    kind: "initiative",
    status: "planned",
  },
  {
    product: "cross-ecosystem",
    category: "Founder thought leadership",
    title: "Founder essay series",
    description: "A series of essays on the ecosystem vision.",
    kind: "idea",
    status: "idea",
  },
  {
    product: "cross-ecosystem",
    category: "Open-source initiatives",
    title: "Open-source scope",
    description: "Decide what, if anything, should be open-sourced and why.",
    kind: "idea",
    status: "idea",
  },
  {
    product: "cross-ecosystem",
    category: "Community building",
    title: "Community programme outline",
    description: "Outline how community members could contribute to RTW and the wider ecosystem.",
    kind: "idea",
    status: "idea",
  },
  {
    product: "future-research",
    category: "Agents and services",
    title: "How Can AI Agents Safely Discover and Execute External Services?",
    description: "Research question spanning Morph Space, Skalle AI and Synx identity work.",
    kind: "research",
    status: "researching",
  },
  {
    product: "future-research",
    category: "Experiments",
    title: "Experiment backlog",
    description: "Holding area for experiments that are not yet tied to a product.",
    kind: "note",
    status: "idea",
  },
];

export interface TemplateOptions {
  workspaceName: string;
  includeTemplate: boolean;
  includeExamples: boolean;
  productSlugs?: string[];
}

export function buildWorkspace(opts: TemplateOptions): WorkspaceData {
  const data = emptyWorkspaceData(opts.workspaceName);
  const t = nowIso();
  const today = new Date();
  const example = opts.includeExamples;

  const add = <K extends CollectionKey>(key: K, record: WorkspaceData[K][string]) => {
    (data[key] as Record<ID, typeof record>)[record.id] = record;
    return record;
  };
  const link = (aType: CollectionKey, aId: ID, bType: CollectionKey, bId: ID, label = "") =>
    add("links", make("links", { aType, aId, bType, bId, label, isExample: example }));

  const root = add(
    "nodes",
    make("nodes", {
      title: opts.includeTemplate ? "Mindmap — Synx Ecosystem" : opts.workspaceName,
      description: opts.includeTemplate
        ? "The strategic map of products, content, research and initiatives across the Synx ecosystem."
        : "",
      kind: "root",
      status: null,
    }),
  );

  const productIds: Record<string, ID> = {};
  const categoryIds: Record<string, ID> = {};
  const categoryNodeIds: Record<string, ID> = {};

  if (opts.includeTemplate) {
    const templates = ECOSYSTEM_TEMPLATE.filter((p) => !opts.productSlugs || opts.productSlugs.includes(p.slug));
    templates.forEach((tpl, i) => {
      const product = add(
        "products",
        make("products", {
          slug: tpl.slug,
          name: tpl.name,
          kind: tpl.kind,
          url: tpl.url,
          tagline: tpl.tagline,
          description: tpl.description,
          goals: example ? tpl.goals : [],
          researchQuestions: example ? tpl.researchQuestions : [],
          order: i,
        }),
      );
      productIds[tpl.slug] = product.id;
      tpl.categories.forEach((name, ci) => {
        const cat = add("categories", make("categories", { productId: product.id, name, order: ci }));
        categoryIds[`${tpl.slug}/${name}`] = cat.id;
      });
      const branch = add(
        "nodes",
        make("nodes", {
          title: tpl.name,
          description: tpl.tagline,
          kind: "product",
          parentId: root.id,
          productId: product.id,
          status: null,
          order: i,
        }),
      );
      tpl.mapCategories.forEach((name, ci) => {
        const node = add(
          "nodes",
          make("nodes", {
            title: name,
            kind: "category",
            parentId: branch.id,
            productId: product.id,
            status: null,
            order: ci,
          }),
        );
        categoryNodeIds[`${tpl.slug}/${name}`] = node.id;
      });
    });
  }

  if (opts.includeTemplate && example) {
    const nodeByTitle: Record<string, ID> = {};
    const contentByTitle: Record<string, ID> = {};

    EXAMPLE_LEAVES.forEach((leaf, i) => {
      const parentId = categoryNodeIds[`${leaf.product}/${leaf.category}`];
      const productId = productIds[leaf.product];
      if (!parentId || !productId) return;
      const node = add(
        "nodes",
        make("nodes", {
          title: leaf.title,
          description: leaf.description,
          kind: leaf.kind,
          parentId,
          productId,
          contentType: leaf.contentType ?? null,
          status: leaf.status ?? "idea",
          order: i,
          isExample: true,
        }),
      );
      nodeByTitle[leaf.title] = node.id;
      if (leaf.content && leaf.contentType) {
        const item = add(
          "content",
          make("content", {
            title: leaf.title,
            summary: leaf.description,
            productId,
            categoryId: categoryIds[`${leaf.product}/${leaf.category}`] ?? null,
            contentType: leaf.contentType,
            nature: leaf.content.nature ?? "evergreen",
            status: leaf.status ?? "idea",
            priority: leaf.content.priority ?? "medium",
            audience: leaf.content.audience ?? "",
            objective: leaf.content.objective ?? "",
            dueDate: leaf.content.dueInDays !== undefined ? toDay(addDays(today, leaf.content.dueInDays)) : "",
            isExample: true,
          }),
        );
        contentByTitle[leaf.title] = item.id;
        link("content", item.id, "nodes", node.id);
      }
    });

    // Library-only examples (not every record needs a map node).
    const extra = [
      {
        title: "RTW FAQ: common first questions",
        product: "real-time-web",
        category: "Glossary and FAQs",
        contentType: "glossary" as const,
        status: "idea" as const,
      },
      {
        title: "Synx Tools release notes — template entry",
        product: "synx-tools",
        category: "Product updates and release notes",
        contentType: "release_note" as const,
        status: "idea" as const,
        nature: "news" as const,
      },
      {
        title: "Launch announcement draft (cross-product)",
        product: "cross-ecosystem",
        category: "Product launches",
        contentType: "announcement" as const,
        status: "idea" as const,
        nature: "news" as const,
      },
      {
        title: "Founder essay: why a real-time web",
        product: "cross-ecosystem",
        category: "Founder thought leadership",
        contentType: "article" as const,
        status: "idea" as const,
      },
    ];
    for (const e of extra) {
      const item = add(
        "content",
        make("content", {
          title: e.title,
          productId: productIds[e.product] ?? null,
          categoryId: categoryIds[`${e.product}/${e.category}`] ?? null,
          contentType: e.contentType,
          status: e.status,
          nature: e.nature ?? "evergreen",
          isExample: true,
        }),
      );
      contentByTitle[e.title] = item.id;
    }
    // A record related to several products without being duplicated.
    const essay = contentByTitle["Founder essay: why a real-time web"];
    if (essay && productIds["real-time-web"]) link("content", essay, "products", productIds["real-time-web"]);

    // Cross-references on the map.
    const cross = (a: string, b: string, label: string) => {
      if (nodeByTitle[a] && nodeByTitle[b])
        add("edges", make("edges", { source: nodeByTitle[a], target: nodeByTitle[b], label, isExample: true }));
    };
    cross("Decentralized Internet Architecture", "Identity and Access Architecture", "references");
    cross("Service Discovery Concept", "How Can AI Agents Safely Discover and Execute External Services?", "informs");
    cross("Skalle Product Overview", "Product Launch Communications Plan", "used in");
    cross("Permissions for people, agents and services", "Identity and Access Architecture", "builds on");

    // PR & marketing.
    const launchPlan = add(
      "initiatives",
      make("initiatives", {
        name: "Product Launch Communications Plan",
        type: "product_launch",
        objective: "Agree on a repeatable way to announce launches across the ecosystem.",
        audience: "Press, community and developers",
        productId: productIds["cross-ecosystem"] ?? null,
        keyMessage: "To be defined with product owners.",
        channels: ["Website", "Social media", "Press"],
        status: "planned",
        priority: "high",
        successCriteria: "Every launch has an owner, a message and a checklist before it is scheduled.",
        isExample: true,
      }),
    );
    const essays = add(
      "initiatives",
      make("initiatives", {
        name: "Founder thought leadership series",
        type: "thought_leadership",
        objective: "Publish a series of essays on the ecosystem vision.",
        productId: productIds["cross-ecosystem"] ?? null,
        channels: ["Blog", "LinkedIn"],
        status: "idea",
        priority: "medium",
        startDate: toDay(addDays(today, 7)),
        endDate: toDay(addDays(today, 63)),
        notes: "Planning window only — adjust once the first essay is drafted.",
        isExample: true,
      }),
    );
    add(
      "initiatives",
      make("initiatives", {
        name: "Skalle universe reveal",
        type: "campaign",
        objective: "Introduce the fictional universe once Issue 1 is ready.",
        productId: productIds["skalle-ai"] ?? null,
        channels: ["Social media"],
        status: "idea",
        priority: "low",
        notes: "Keep campaign copy clearly fictional.",
        isExample: true,
      }),
    );
    if (contentByTitle["Launch announcement draft (cross-product)"])
      link("initiatives", launchPlan.id, "content", contentByTitle["Launch announcement draft (cross-product)"]);
    if (contentByTitle["Skalle Product Overview"])
      link("initiatives", launchPlan.id, "content", contentByTitle["Skalle Product Overview"]);
    if (essay) link("initiatives", essays.id, "content", essay);
    if (nodeByTitle["Product Launch Communications Plan"])
      link("initiatives", launchPlan.id, "nodes", nodeByTitle["Product Launch Communications Plan"]);

    // Research.
    const agents = add(
      "research",
      make("research", {
        title: "How Can AI Agents Safely Discover and Execute External Services?",
        productId: productIds["future-research"] ?? null,
        problem:
          "Agents that act on a user's behalf need to find services, understand what they do, and call them without exceeding the permissions they were given.",
        targetUser: "Teams building agents and teams exposing services to agents",
        alternatives: "Manually configured integrations; human-curated tool lists.",
        toInvestigate: "Existing service-description formats (for example OpenAPI) and published work on agent tool use.",
        limitations: "To be documented after the literature review.",
        hypothesis:
          "A shared description of capabilities plus explicit, scoped permissions would let agents discover and use services more safely than ad-hoc integrations.",
        impact: "Could inform Morph Space service discovery and Synx identity work.",
        feasibility: "unknown",
        risks: "Assumes services are willing to publish machine-readable descriptions.",
        experiment: "Prototype discovery against a small set of internal test services.",
        successCriteria: "Define before the experiment starts.",
        evidence: [
          {
            id: uid(),
            kind: "hypothesis",
            statement: "Scoped permissions reduce the risk of agents taking unintended actions.",
            url: "",
          },
          { id: uid(), kind: "planned", statement: "Literature review of agent tool-use research.", url: "" },
          {
            id: uid(),
            kind: "fact",
            statement: "OpenAPI is an existing specification for describing HTTP APIs.",
            url: "https://www.openapis.org/",
          },
        ],
        decision: "investigate",
        status: "researching",
        priority: "high",
        isExample: true,
      }),
    );
    const discovery = add(
      "research",
      make("research", {
        title: "Service discovery model for Morph Space",
        productId: productIds["morph-space"] ?? null,
        problem: "Participants need a way to find capabilities and resources in a connected environment.",
        hypothesis: "To be written.",
        decision: "undecided",
        status: "idea",
        isExample: true,
      }),
    );
    add(
      "research",
      make("research", {
        title: "Community contribution model for RTW knowledge articles",
        productId: productIds["real-time-web"] ?? null,
        problem: "How can community contributions be accepted without weakening editorial quality?",
        decision: "undecided",
        status: "idea",
        priority: "low",
        isExample: true,
      }),
    );
    link("research", agents.id, "research", discovery.id, "related");
    if (nodeByTitle["How Can AI Agents Safely Discover and Execute External Services?"])
      link("research", agents.id, "nodes", nodeByTitle["How Can AI Agents Safely Discover and Execute External Services?"]);
    if (contentByTitle["Service Discovery Concept"])
      link("research", discovery.id, "content", contentByTitle["Service Discovery Concept"]);
    if (productIds["morph-space"]) link("research", agents.id, "products", productIds["morph-space"]);

    // Tasks.
    const outline = add(
      "tasks",
      make("tasks", {
        title: "Outline “What Is a Real-Time Web?”",
        productId: productIds["real-time-web"] ?? null,
        status: "in_progress",
        priority: "high",
        startDate: toDay(today),
        dueDate: toDay(addDays(today, 4)),
        isExample: true,
      }),
    );
    add(
      "tasks",
      make("tasks", {
        title: "First full draft of “What Is a Real-Time Web?”",
        productId: productIds["real-time-web"] ?? null,
        priority: "high",
        startDate: toDay(addDays(today, 4)),
        dueDate: toDay(addDays(today, 9)),
        dependsOn: [outline.id],
        isExample: true,
      }),
    );
    const notes = add(
      "tasks",
      make("tasks", {
        title: "Collect identity architecture source notes from engineering",
        productId: productIds["synx-tools"] ?? null,
        priority: "high",
        dueDate: toDay(addDays(today, 6)),
        isExample: true,
      }),
    );
    add(
      "tasks",
      make("tasks", {
        title: "Review identity architecture outline",
        productId: productIds["synx-tools"] ?? null,
        priority: "medium",
        dueDate: toDay(addDays(today, 12)),
        dependsOn: [notes.id],
        isExample: true,
      }),
    );
    add(
      "tasks",
      make("tasks", {
        title: "Assign owners for the launch communications plan",
        productId: productIds["cross-ecosystem"] ?? null,
        priority: "medium",
        isExample: true,
      }),
    );

    // Skalle universe (fiction).
    const arc = add(
      "arcs",
      make("arcs", {
        title: "Arc 1 — Origins (working title)",
        synopsis: "Placeholder arc for the first issues. Replace with the agreed story outline.",
        themes: "Collaboration between people and machines",
        order: 1,
        status: "idea",
        isExample: true,
      }),
    );
    const issue = add(
      "issues",
      make("issues", {
        title: "Origin Story",
        issueNumber: 1,
        synopsis: "The opening issue of the Skalle universe. Synopsis to be written.",
        arcId: arc.id,
        isExample: true,
      }),
    );
    const protagonist = add(
      "characters",
      make("characters", {
        name: "The Operator (placeholder)",
        role: "Protagonist",
        background: "Placeholder profile. Replace with the agreed character bible entry.",
        isExample: true,
      }),
    );
    const archivist = add(
      "characters",
      make("characters", {
        name: "The Archivist (placeholder)",
        role: "Mentor",
        background: "Placeholder profile.",
        isExample: true,
      }),
    );
    const bible = add(
      "lore",
      make("lore", {
        title: "Universe bible: tone and rules (draft)",
        kind: "bible",
        body: "Define tone, rules of the world, and what the fiction must never imply about the real product.",
        isExample: true,
      }),
    );
    add(
      "lore",
      make("lore", {
        title: "Prologue",
        kind: "timeline_event",
        era: "Before Issue 1",
        order: 1,
        body: "Placeholder timeline event.",
        isExample: true,
      }),
    );
    add(
      "lore",
      make("lore", {
        title: "Humans and agents as collaborators",
        kind: "theme",
        body: "Candidate central theme.",
        isExample: true,
      }),
    );
    link("characters", protagonist.id, "characters", archivist.id, "mentored by");
    link("issues", issue.id, "characters", protagonist.id, "features");
    link("issues", issue.id, "characters", archivist.id, "features");
    link("issues", issue.id, "lore", bible.id, "follows");
    if (contentByTitle["Origin Story — Comic Issue 1"])
      link("issues", issue.id, "content", contentByTitle["Origin Story — Comic Issue 1"], "production record");
  }

  const positions = tidyLayout(Object.values(data.nodes) as MapNode[]);
  for (const [id, pos] of Object.entries(positions)) data.nodes[id].position = pos;

  data.activity.push({
    id: uid(),
    at: t,
    action: "initialized",
    collection: "workspace",
    entityId: data.workspace.id,
    title: opts.includeTemplate
      ? `Workspace created from the Synx ecosystem template${example ? " with example ideas" : ""}`
      : "Workspace created",
  });
  return data;
}
