import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const serverDirectory = path.resolve(scriptDirectory, "..");
const repositoryDirectory = path.resolve(serverDirectory, "..");
const modulesDirectory = path.join(serverDirectory, "src", "modules");

const EXPECTED_ENDPOINT_COUNT = 35;
const IMPLEMENTED_SECTION_START = "## 4. 已实现接口";
const IMPLEMENTED_SECTION_END = "## 5. 未实现接口草案";
const HTTP_METHOD_PATTERN = "get|post|put|patch|delete";

const normalizePath = (value) => {
  const normalized = value
    .replace(/\{([^}]+)\}/g, ":$1")
    .replace(/\/+/g, "/");
  return normalized.length > 1 ? normalized.replace(/\/$/, "") : normalized;
};

const formatEndpoint = (method, endpointPath) =>
  `${method.toUpperCase()} ${normalizePath(endpointPath)}`;

const assertNoDuplicates = (name, endpoints) => {
  const duplicates = endpoints.filter(
    (endpoint, index) => endpoints.indexOf(endpoint) !== index
  );

  if (duplicates.length > 0) {
    throw new Error(`${name} 存在重复接口：${[...new Set(duplicates)].join(", ")}`);
  }
};

const readExpressEndpoints = async () => {
  const appSource = await readFile(
    path.join(serverDirectory, "src", "app.ts"),
    "utf8"
  );
  const routeFiles = [];

  for (const moduleName of await readdir(modulesDirectory)) {
    const moduleDirectory = path.join(modulesDirectory, moduleName);
    for (const fileName of await readdir(moduleDirectory)) {
      if (fileName.endsWith(".routes.ts")) {
        routeFiles.push(path.join(moduleDirectory, fileName));
      }
    }
  }

  const endpoints = [];

  for (const routeFile of routeFiles) {
    const source = await readFile(routeFile, "utf8");
    const exportMatch = source.match(
      /export const (\w+Routes) = Router\(\);/
    );

    if (!exportMatch) {
      throw new Error(`无法识别路由变量：${routeFile}`);
    }

    const routeVariable = exportMatch[1];
    const mountPattern = new RegExp(
      `app\\.use\\(\\s*"([^"]+)"\\s*,\\s*${routeVariable}\\s*\\)`
    );
    const mountMatch = appSource.match(mountPattern);

    if (!mountMatch) {
      throw new Error(`无法识别路由挂载点：${routeVariable}`);
    }

    const routePattern = new RegExp(
      `${routeVariable}\\.(${HTTP_METHOD_PATTERN})\\s*\\(\\s*"([^"]+)"`,
      "gs"
    );

    for (const match of source.matchAll(routePattern)) {
      endpoints.push(formatEndpoint(match[1], `${mountMatch[1]}${match[2]}`));
    }
  }

  return endpoints.sort();
};

const readApiMarkdownEndpoints = async () => {
  const source = await readFile(
    path.join(repositoryDirectory, "docs", "API.md"),
    "utf8"
  );
  const startIndex = source.indexOf(IMPLEMENTED_SECTION_START);
  const endIndex = source.indexOf(IMPLEMENTED_SECTION_END);

  if (startIndex < 0 || endIndex <= startIndex) {
    throw new Error("API.md 缺少已实现/未实现接口分区标记");
  }

  const implementedSection = source.slice(startIndex, endIndex);
  const endpoints = [];
  const endpointPattern =
    /\|\s*(GET|POST|PUT|PATCH|DELETE)\s*\|\s*`([^`]+)`/g;

  for (const match of implementedSection.matchAll(endpointPattern)) {
    endpoints.push(formatEndpoint(match[1], match[2]));
  }

  return endpoints.sort();
};

const readOpenApiEndpoints = async () => {
  const source = await readFile(
    path.join(repositoryDirectory, "docs", "openapi.yaml"),
    "utf8"
  );
  const endpoints = [];
  let currentPath = "";

  for (const line of source.split(/\r?\n/)) {
    const pathMatch = line.match(/^  (\/api\/[^:]+):\s*$/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      continue;
    }

    const methodMatch = line.match(
      new RegExp(`^    (${HTTP_METHOD_PATTERN}):\\s*$`)
    );
    if (currentPath && methodMatch) {
      endpoints.push(formatEndpoint(methodMatch[1], currentPath));
    }
  }

  return endpoints.sort();
};

const compareEndpointSets = (leftName, left, rightName, right) => {
  const leftOnly = left.filter((endpoint) => !right.includes(endpoint));
  const rightOnly = right.filter((endpoint) => !left.includes(endpoint));

  if (leftOnly.length || rightOnly.length) {
    const details = [
      leftOnly.length
        ? `${leftName} 独有：${leftOnly.join(", ")}`
        : undefined,
      rightOnly.length
        ? `${rightName} 独有：${rightOnly.join(", ")}`
        : undefined
    ].filter(Boolean);
    throw new Error(details.join("\n"));
  }
};

const expressEndpoints = await readExpressEndpoints();
const apiMarkdownEndpoints = await readApiMarkdownEndpoints();
const openApiEndpoints = await readOpenApiEndpoints();

for (const [name, endpoints] of [
  ["Express routes", expressEndpoints],
  ["API.md", apiMarkdownEndpoints],
  ["openapi.yaml", openApiEndpoints]
]) {
  assertNoDuplicates(name, endpoints);
  if (endpoints.length !== EXPECTED_ENDPOINT_COUNT) {
    throw new Error(
      `${name} 接口数量应为 ${EXPECTED_ENDPOINT_COUNT}，实际为 ${endpoints.length}`
    );
  }
}

compareEndpointSets(
  "Express routes",
  expressEndpoints,
  "API.md",
  apiMarkdownEndpoints
);
compareEndpointSets(
  "Express routes",
  expressEndpoints,
  "openapi.yaml",
  openApiEndpoints
);

console.log(
  `API_CONTRACT_VERIFIED: ${EXPECTED_ENDPOINT_COUNT} endpoints are synchronized.`
);
