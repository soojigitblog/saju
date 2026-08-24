import "server-only";

import { z } from "zod";

/** JSON Schema keywords rejected or unsupported by Gemini Structured Output. */
const STRIP_KEYS = new Set([
  "$schema",
  "$id",
  "$ref",
  "$defs",
  "$anchor",
  "$dynamicAnchor",
  "$dynamicRef",
  "oneOf",
  "anyOf",
  "allOf",
  "not",
  "if",
  "then",
  "else",
  "dependentRequired",
  "dependentSchemas",
  "patternProperties",
  "propertyNames",
  "unevaluatedProperties",
  "unevaluatedItems",
  "contentEncoding",
  "contentMediaType",
  "contentSchema",
  "prefixItems",
  "uniqueItems",
  "const",
  "pattern",
  "format",
  "minLength",
  "maxLength",
  "minProperties",
  "maxProperties",
  "multipleOf",
  "exclusiveMinimum",
  "exclusiveMaximum",
]);

type JsonSchemaNode = Record<string, unknown>;

/**
 * Convert canonical Zod schema → Gemini-compatible JSON Schema subset.
 * Final validation remains Zod + semantic validators after response.
 */
export function zodToGeminiJsonSchema(schema: z.ZodType): JsonSchemaNode {
  const raw = z.toJSONSchema(schema) as JsonSchemaNode;
  const defs = (raw.$defs ?? raw.definitions) as
    | Record<string, JsonSchemaNode>
    | undefined;
  return sanitizeGeminiSchemaNode(raw, defs) as JsonSchemaNode;
}

function sanitizeGeminiSchemaNode(
  node: unknown,
  defs?: Record<string, JsonSchemaNode>
): unknown {
  if (node === null || typeof node !== "object" || Array.isArray(node)) {
    if (Array.isArray(node)) {
      return node.map((item) => sanitizeGeminiSchemaNode(item, defs));
    }
    return node;
  }

  const obj = node as JsonSchemaNode;

  if (typeof obj.$ref === "string" && defs) {
    const resolved = resolveRef(obj.$ref, defs);
    if (resolved) {
      return sanitizeGeminiSchemaNode(resolved, defs);
    }
  }

  if (Array.isArray(obj.anyOf)) {
    const nonNull = obj.anyOf.filter(
      (branch) =>
        branch &&
        typeof branch === "object" &&
        (branch as JsonSchemaNode).type !== "null"
    );
    if (nonNull.length === 1) {
      return sanitizeGeminiSchemaNode(nonNull[0], defs);
    }
    if (nonNull.length > 1) {
      const merged = mergeAnyOfBranches(nonNull as JsonSchemaNode[]);
      return sanitizeGeminiSchemaNode(merged, defs);
    }
  }

  if (Array.isArray(obj.oneOf)) {
    const merged = mergeAnyOfBranches(obj.oneOf as JsonSchemaNode[]);
    return sanitizeGeminiSchemaNode(merged, defs);
  }

  if ("const" in obj) {
    return sanitizeGeminiSchemaNode(
      { type: inferTypeFromConst(obj.const), enum: [obj.const] },
      defs
    );
  }

  const out: JsonSchemaNode = {};

  for (const [key, value] of Object.entries(obj)) {
    if (STRIP_KEYS.has(key)) continue;
    if (key === "additionalProperties") continue;
    if (key === "minItems" || key === "maxItems") continue;
    if (key === "type" && value === "null") continue;
    if (key === "type" && value === "integer") {
      out.type = "number";
      continue;
    }

    if (key === "properties" && value && typeof value === "object") {
      const props: JsonSchemaNode = {};
      for (const [propKey, propVal] of Object.entries(
        value as Record<string, unknown>
      )) {
        props[propKey] = sanitizeGeminiSchemaNode(propVal, defs);
      }
      out.properties = props;
      continue;
    }

    if (key === "items") {
      out.items = sanitizeGeminiSchemaNode(value, defs);
      continue;
    }

    if (key === "required" && Array.isArray(value)) {
      out.required = value;
      continue;
    }

    if (key === "enum" && Array.isArray(value)) {
      out.enum = value;
      continue;
    }

    if (
      key === "type" ||
      key === "minimum" ||
      key === "maximum" ||
      key === "minItems" ||
      key === "maxItems" ||
      key === "description"
    ) {
      out[key] = value;
    }
  }

  if (out.type === "integer") {
    out.type = "number";
  }

  return out;
}

function resolveRef(ref: string, defs: Record<string, JsonSchemaNode>): unknown {
  const name = ref.replace(/^#\/(\$defs|definitions)\//, "");
  return defs[name];
}

/** Merge enum branches into a single string enum when possible. */
function mergeAnyOfBranches(branches: JsonSchemaNode[]): JsonSchemaNode {
  const enums: unknown[] = [];
  for (const branch of branches) {
    if (Array.isArray(branch.enum)) {
      enums.push(...branch.enum);
      continue;
    }
    if ("const" in branch) {
      enums.push(branch.const);
    }
  }
  if (enums.length > 0) {
    return { type: "string", enum: [...new Set(enums)] };
  }
  const objectBranch = branches.find((b) => b.type === "object");
  if (objectBranch) return objectBranch;
  return branches[0] ?? { type: "string" };
}

function inferTypeFromConst(value: unknown): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? "integer" : "number";
  }
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value)) return "array";
  if (value !== null && typeof value === "object") return "object";
  return "string";
}
