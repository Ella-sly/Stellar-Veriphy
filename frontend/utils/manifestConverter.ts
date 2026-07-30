export function jsonToXml(obj: any, rootName = "manifest"): string {
  const escape = (str: string) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const convert = (obj: any, name: string): string => {
    if (obj === null || obj === undefined) {
      return `<${name} />`;
    }

    if (typeof obj !== "object") {
      return `<${name}>${escape(obj)}</${name}>`;
    }

    if (Array.isArray(obj)) {
      return obj
        .map((item) => convert(item, name.replace(/s$/, "")))
        .join("\n");
    }

    const children = Object.entries(obj)
      .map(([key, value]) => convert(value, key))
      .join("\n");

    return `<${name}>\n${children}\n</${name}>`;
  };

  return `<?xml version="1.0" encoding="UTF-8"?>\n${convert(obj, rootName)}`;
}

export function xmlToJson(xml: string): any {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");

  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Invalid XML");
  }

  const convert = (node: Element): any => {
    const obj: any = {};

    if (node.children.length === 0) {
      return node.textContent || "";
    }

    for (const child of node.children) {
      const key = child.tagName;
      const value = convert(child);

      if (obj[key]) {
        if (!Array.isArray(obj[key])) {
          obj[key] = [obj[key]];
        }
        obj[key].push(value);
      } else {
        obj[key] = value;
      }
    }

    return obj;
  };

  return convert(doc.documentElement);
}
