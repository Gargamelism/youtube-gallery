import sys
import json
from typing import Dict, Any
import defusedxml
from xml.sax.saxutils import escape

defusedxml.defuse_stdlib()


def bandit_to_checkstyle(bandit_report: Dict[str, Any]) -> None:
    print('<?xml version="1.0" encoding="UTF-8"?>')
    print('<checkstyle version="4.3">')

    for result in bandit_report.get("results", []):
        filename = escape(result["filename"])
        line = result.get("line_number", 1)
        message = escape(result["issue_text"])
        severity = result["issue_severity"].lower()

        print(f'  <file name="{filename}">')
        print(f'    <error line="{line}" severity="{severity}" message="{message}" source="bandit" />')
        print("  </file>")

    print("</checkstyle>")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: Please provide a bandit report file as argument", file=sys.stderr)
        sys.exit(1)

    with open(sys.argv[1], "r", encoding="utf-8") as file:
        bandit_report: Dict[str, Any] = json.load(file)
    bandit_to_checkstyle(bandit_report)
