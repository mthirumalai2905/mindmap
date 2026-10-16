import {
  BookOpen,
  Boxes,
  CheckSquare,
  FileText,
  FlaskConical,
  FolderTree,
  GitBranch,
  Layers,
  Link2,
  Megaphone,
  ScrollText,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import {
  CONTENT_NATURE_LABELS,
  CONTENT_TYPE_LABELS,
  DECISION_LABELS,
  FEASIBILITY_LABELS,
  INITIATIVE_TYPE_LABELS,
  LORE_KIND_LABELS,
  NODE_KIND_LABELS,
  PRIORITY_LABELS,
  PRODUCTION_STATUS_LABELS,
  PUBLICATION_STATUS_LABELS,
  TASK_STATUS_LABELS,
  type CollectionKey,
} from "./types";

export type Option = { value: string; label: string };
const opts = (labels: Record<string, string>): Option[] =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

export type FieldDef =
  | { kind: "text" | "textarea" | "longtext" | "date" | "url"; key: string; label: string; placeholder?: string; hint?: string }
  | { kind: "number"; key: string; label: string }
  | { kind: "select"; key: string; label: string; options: Option[]; nullable?: boolean }
  | { kind: "status"; key: string; label: string; nullable?: boolean }
  | { kind: "product"; key: string; label: string }
  | { kind: "category"; key: string; label: string }
  | { kind: "ref"; key: string; label: string; target: CollectionKey }
  | { kind: "tags" | "list" | "urls"; key: string; label: string; placeholder?: string }
  | { kind: "links"; label: string; target: CollectionKey; hint?: string }
  | { kind: "dependencies"; key: string; label: string }
  | { kind: "evidence"; key: string; label: string };

export interface Section {
  title?: string;
  description?: string;
  fields: FieldDef[];
}

export interface EntityConfig {
  singular: string;
  plural: string;
  icon: LucideIcon;
  titleKey: "title" | "name";
  href: string;
  searchKeys: string[];
  sections: Section[];
  /** Shown at the top of the sheet. */
  notice?: string;
}

export const PRIORITY_OPTIONS = opts(PRIORITY_LABELS);

const product: FieldDef = { kind: "product", key: "productId", label: "Product" };
const owner: FieldDef = { kind: "text", key: "owner", label: "Owner", placeholder: "Unassigned" };
const priority: FieldDef = { kind: "select", key: "priority", label: "Priority", options: PRIORITY_OPTIONS };
const tags: FieldDef = { kind: "tags", key: "tags", label: "Tags" };

export const ENTITIES: Record<CollectionKey, EntityConfig> = {
  content: {
    singular: "Content",
    plural: "Content",
    icon: FileText,
    titleKey: "title",
    href: "/content",
    searchKeys: ["title", "summary", "body", "audience", "objective"],
    sections: [
      {
        fields: [
          { kind: "textarea", key: "summary", label: "Summary", placeholder: "One or two sentences on what this is" },
          { kind: "status", key: "status", label: "Status" },
          priority,
          { kind: "select", key: "contentType", label: "Type", options: opts(CONTENT_TYPE_LABELS) },
          { kind: "select", key: "nature", label: "Nature", options: opts(CONTENT_NATURE_LABELS) },
          product,
          { kind: "category", key: "categoryId", label: "Category" },
          owner,
          { kind: "date", key: "dueDate", label: "Due date" },
          { kind: "date", key: "publishDate", label: "Publication date" },
          tags,
        ],
      },
      {
        title: "Strategy",
        fields: [
          { kind: "text", key: "audience", label: "Audience" },
          { kind: "textarea", key: "objective", label: "Strategic objective" },
        ],
      },
      {
        title: "Relationships",
        fields: [
          { kind: "links", label: "Also relates to products", target: "products", hint: "Primary product is set above" },
          { kind: "links", label: "Mind map nodes", target: "nodes" },
          { kind: "links", label: "Initiatives", target: "initiatives" },
          { kind: "links", label: "Research", target: "research" },
          { kind: "urls", key: "urls", label: "Sources and references" },
        ],
      },
      { title: "Draft / working notes", fields: [{ kind: "longtext", key: "body", label: "Draft", placeholder: "Write or paste the working draft…" }] },
    ],
  },
  initiatives: {
    singular: "Initiative",
    plural: "PR & marketing initiatives",
    icon: Megaphone,
    titleKey: "name",
    href: "/marketing",
    searchKeys: ["name", "objective", "keyMessage", "notes", "audience"],
    notice: "Planning only — nothing here sends email, publishes posts, or contacts media.",
    sections: [
      {
        fields: [
          { kind: "select", key: "type", label: "Type", options: opts(INITIATIVE_TYPE_LABELS) },
          { kind: "status", key: "status", label: "Status" },
          priority,
          product,
          owner,
          { kind: "date", key: "startDate", label: "Start date" },
          { kind: "date", key: "endDate", label: "End date" },
        ],
      },
      {
        title: "Plan",
        fields: [
          { kind: "textarea", key: "objective", label: "Objective" },
          { kind: "text", key: "audience", label: "Target audience" },
          { kind: "textarea", key: "keyMessage", label: "Key message" },
          { kind: "list", key: "channels", label: "Channels", placeholder: "Add a channel" },
          { kind: "list", key: "targets", label: "Target publications or partners", placeholder: "Add a target" },
          { kind: "textarea", key: "successCriteria", label: "Success criteria" },
        ],
      },
      {
        title: "Related assets",
        fields: [
          { kind: "links", label: "Content and assets", target: "content" },
          { kind: "links", label: "Mind map nodes", target: "nodes" },
          { kind: "links", label: "Tasks", target: "tasks" },
        ],
      },
      { title: "Notes", fields: [{ kind: "longtext", key: "notes", label: "Notes" }] },
    ],
  },
  research: {
    singular: "Research idea",
    plural: "Research ideas",
    icon: FlaskConical,
    titleKey: "title",
    href: "/research",
    searchKeys: ["title", "problem", "hypothesis", "experiment"],
    sections: [
      {
        fields: [
          { kind: "select", key: "decision", label: "Decision", options: opts(DECISION_LABELS) },
          { kind: "status", key: "status", label: "Status" },
          priority,
          product,
          owner,
          { kind: "date", key: "dueDate", label: "Review by" },
          { kind: "select", key: "feasibility", label: "Technical feasibility", options: opts(FEASIBILITY_LABELS) },
          tags,
        ],
      },
      {
        title: "Problem",
        fields: [
          { kind: "textarea", key: "problem", label: "Problem statement" },
          { kind: "text", key: "targetUser", label: "Target user" },
          { kind: "textarea", key: "alternatives", label: "Current alternatives" },
          { kind: "textarea", key: "toInvestigate", label: "Existing research or products to investigate" },
          { kind: "textarea", key: "limitations", label: "Limitations of current approaches" },
        ],
      },
      {
        title: "Proposal",
        fields: [
          { kind: "textarea", key: "hypothesis", label: "Proposed hypothesis" },
          { kind: "textarea", key: "impact", label: "Expected impact" },
          { kind: "textarea", key: "risks", label: "Risks and assumptions" },
          { kind: "textarea", key: "experiment", label: "Proposed experiment" },
          { kind: "textarea", key: "successCriteria", label: "Success criteria" },
        ],
      },
      {
        title: "Evidence",
        description: "Classify every claim. Nothing is treated as novel without supporting evidence.",
        fields: [{ kind: "evidence", key: "evidence", label: "Evidence and references" }],
      },
      {
        title: "Relationships",
        fields: [
          { kind: "links", label: "Also relates to products", target: "products" },
          { kind: "links", label: "Mind map nodes", target: "nodes" },
          { kind: "links", label: "Content", target: "content" },
          { kind: "links", label: "Related research", target: "research" },
        ],
      },
    ],
  },
  tasks: {
    singular: "Task",
    plural: "Tasks",
    icon: CheckSquare,
    titleKey: "title",
    href: "/roadmap",
    searchKeys: ["title", "description"],
    sections: [
      {
        fields: [
          { kind: "select", key: "status", label: "Status", options: opts(TASK_STATUS_LABELS) },
          priority,
          product,
          owner,
          { kind: "date", key: "startDate", label: "Start date" },
          { kind: "date", key: "dueDate", label: "Due date" },
          { kind: "dependencies", key: "dependsOn", label: "Depends on" },
          { kind: "textarea", key: "description", label: "Description" },
        ],
      },
      {
        title: "Relationships",
        fields: [
          { kind: "links", label: "Content", target: "content" },
          { kind: "links", label: "Initiatives", target: "initiatives" },
          { kind: "links", label: "Research", target: "research" },
        ],
      },
    ],
  },
  characters: {
    singular: "Character",
    plural: "Characters",
    icon: UserRound,
    titleKey: "name",
    href: "/universe",
    searchKeys: ["name", "role", "background"],
    notice: "Fiction — Skalle universe. Not product documentation.",
    sections: [
      {
        fields: [
          { kind: "text", key: "role", label: "Role" },
          { kind: "longtext", key: "background", label: "Background" },
          { kind: "textarea", key: "motivations", label: "Motivations" },
          { kind: "textarea", key: "abilities", label: "Abilities" },
          { kind: "urls", key: "references", label: "Reference images or links" },
          tags,
        ],
      },
      {
        title: "Relationships",
        fields: [
          { kind: "links", label: "Characters", target: "characters" },
          { kind: "links", label: "Comic issues", target: "issues" },
          { kind: "links", label: "Story arcs", target: "arcs" },
          { kind: "links", label: "Lore, locations & civilizations", target: "lore" },
        ],
      },
    ],
  },
  arcs: {
    singular: "Story arc",
    plural: "Story arcs",
    icon: GitBranch,
    titleKey: "title",
    href: "/universe",
    searchKeys: ["title", "synopsis", "themes"],
    notice: "Fiction — Skalle universe. Not product documentation.",
    sections: [
      {
        fields: [
          { kind: "status", key: "status", label: "Status" },
          { kind: "number", key: "order", label: "Order" },
          { kind: "longtext", key: "synopsis", label: "Synopsis" },
          { kind: "textarea", key: "themes", label: "Themes" },
        ],
      },
      {
        title: "Relationships",
        fields: [
          { kind: "links", label: "Characters", target: "characters" },
          { kind: "links", label: "Lore, locations & civilizations", target: "lore" },
        ],
      },
    ],
  },
  issues: {
    singular: "Comic issue",
    plural: "Comic issues",
    icon: BookOpen,
    titleKey: "title",
    href: "/universe",
    searchKeys: ["title", "synopsis", "script"],
    notice: "Fiction — Skalle universe. Not product documentation.",
    sections: [
      {
        fields: [
          { kind: "number", key: "issueNumber", label: "Issue number" },
          { kind: "ref", key: "arcId", label: "Story arc", target: "arcs" },
          { kind: "select", key: "scriptStatus", label: "Script", options: opts(PRODUCTION_STATUS_LABELS) },
          { kind: "select", key: "artStatus", label: "Art / storyboard", options: opts(PRODUCTION_STATUS_LABELS) },
          { kind: "select", key: "reviewStatus", label: "Review", options: opts(PRODUCTION_STATUS_LABELS) },
          { kind: "select", key: "publicationStatus", label: "Publication", options: opts(PUBLICATION_STATUS_LABELS) },
          { kind: "date", key: "publishDate", label: "Publication date" },
          { kind: "longtext", key: "synopsis", label: "Synopsis" },
          { kind: "urls", key: "references", label: "Storyboards and visual references" },
        ],
      },
      {
        title: "Relationships",
        fields: [
          { kind: "links", label: "Characters", target: "characters" },
          { kind: "links", label: "Lore, locations & civilizations", target: "lore" },
          { kind: "links", label: "Related product content", target: "content" },
        ],
      },
      { title: "Script", fields: [{ kind: "longtext", key: "script", label: "Script" }] },
    ],
  },
  lore: {
    singular: "Universe entry",
    plural: "Universe entries",
    icon: ScrollText,
    titleKey: "title",
    href: "/universe",
    searchKeys: ["title", "body", "era"],
    notice: "Fiction — Skalle universe. Not product documentation.",
    sections: [
      {
        fields: [
          { kind: "select", key: "kind", label: "Kind", options: opts(LORE_KIND_LABELS) },
          { kind: "text", key: "era", label: "Era / in-universe date", hint: "Used to place timeline events" },
          { kind: "number", key: "order", label: "Timeline order" },
          { kind: "longtext", key: "body", label: "Entry" },
          { kind: "urls", key: "references", label: "References" },
          tags,
        ],
      },
      {
        title: "Relationships",
        fields: [
          { kind: "links", label: "Characters", target: "characters" },
          { kind: "links", label: "Other entries", target: "lore" },
          { kind: "links", label: "Comic issues", target: "issues" },
        ],
      },
    ],
  },
  nodes: {
    singular: "Map node",
    plural: "Map nodes",
    icon: Sparkles,
    titleKey: "title",
    href: "/map",
    searchKeys: ["title", "description", "notes"],
    sections: [
      {
        fields: [
          { kind: "select", key: "kind", label: "Node type", options: opts(NODE_KIND_LABELS) },
          { kind: "textarea", key: "description", label: "Description" },
        ],
      },
    ],
  },
  products: {
    singular: "Product",
    plural: "Products",
    icon: Boxes,
    titleKey: "name",
    href: "/products",
    searchKeys: ["name", "tagline", "description", "positioning"],
    sections: [
      {
        fields: [
          { kind: "text", key: "tagline", label: "Tagline" },
          { kind: "url", key: "url", label: "Website" },
          {
            kind: "select",
            key: "kind",
            label: "Kind",
            options: [
              { value: "product", label: "Product" },
              { value: "initiative", label: "Initiative" },
            ],
          },
          { kind: "textarea", key: "description", label: "Description" },
          { kind: "textarea", key: "positioning", label: "Positioning" },
          { kind: "text", key: "audience", label: "Audience" },
          { kind: "list", key: "goals", label: "Strategic goals", placeholder: "Add a goal" },
          { kind: "list", key: "researchQuestions", label: "Open research questions", placeholder: "Add a question" },
        ],
      },
    ],
  },
  categories: {
    singular: "Category",
    plural: "Categories",
    icon: FolderTree,
    titleKey: "name",
    href: "/products",
    searchKeys: ["name"],
    sections: [{ fields: [{ kind: "textarea", key: "description", label: "Description" }] }],
  },
  edges: {
    singular: "Cross-link",
    plural: "Cross-links",
    icon: Link2,
    titleKey: "title",
    href: "/map",
    searchKeys: ["label"],
    sections: [],
  },
  links: {
    singular: "Relationship",
    plural: "Relationships",
    icon: Layers,
    titleKey: "title",
    href: "/",
    searchKeys: [],
    sections: [],
  },
};

/** Collections that can be opened in the generic record sheet. */
export const SHEET_COLLECTIONS: CollectionKey[] = [
  "content",
  "initiatives",
  "research",
  "tasks",
  "characters",
  "arcs",
  "issues",
  "lore",
  "products",
];
