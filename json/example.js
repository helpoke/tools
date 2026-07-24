// JSON 格式化工具 - 示例数据
const JSON_EXAMPLE = {
  "name": "helpoke JSON 工具示例",
  "version": "2.0.0",
  "description": "一个涵盖多种数据类型的复杂 JSON 示例，用于测试格式化、折叠、比对等功能",
  "metadata": {
    "created": "2025-01-15T08:30:00.000Z",
    "updated": "2025-07-24T16:45:30.123Z",
    "author": {
      "name": "helpoke",
      "email": "contact@helpoke.com",
      "social": {
        "github": "https://github.com/neopen",
        "website": "https://helpoke.com"
      }
    },
    "tags": ["json", "tool", "formatter", "validator", "converter"],
    "license": "MIT"
  },
  "statistics": {
    "totalUsers": 158320,
    "activeUsers": 42756,
    "growthRate": 12.5,
    "rating": 4.8,
    "isVerified": true,
    "isDeprecated": false,
    "nullableField": null
  },
  "features": [
    {
      "id": 1,
      "name": "JSON 格式化",
      "enabled": true,
      "category": "core",
      "config": {
        "indentSize": 2,
        "sortKeys": false,
        "preserveComments": true
      },
      "usageCount": 89200
    },
    {
      "id": 2,
      "name": "JSON 比对",
      "enabled": true,
      "category": "core",
      "config": {
        "ignoreWhitespace": true,
        "ignoreCase": false,
        "highlightDiff": true
      },
      "usageCount": 34500
    },
    {
      "id": 3,
      "name": "JSON 转 Java Bean",
      "enabled": true,
      "category": "converter",
      "config": {
        "useLombok": true,
        "generateBuilder": false,
        "packageName": "com.example.model"
      },
      "usageCount": 21000
    },
    {
      "id": 4,
      "name": "JSON 转 XML",
      "enabled": true,
      "category": "converter",
      "config": {
        "rootElement": "root",
        "attributeMode": false,
        "cdataWrap": true
      },
      "usageCount": 15600
    },
    {
      "id": 5,
      "name": "节点折叠",
      "enabled": true,
      "category": "view",
      "config": {
        "maxDepth": 100,
        "collapseArrays": false,
        "showItemCount": true
      },
      "usageCount": 67800
    }
  ],
  "nested": {
    "level1": {
      "level2": {
        "level3": {
          "level4": {
            "level5": {
              "message": "这是第5层嵌套，测试深度折叠功能",
              "value": [1, 2, 3, 4, 5],
              "deep": true
            }
          },
          "array": [
            {"id": 1, "type": "alpha", "active": true},
            {"id": 2, "type": "beta", "active": false},
            {"id": 3, "type": "gamma", "active": true},
            {"id": 4, "type": "delta", "active": true},
            {"id": 5, "type": "epsilon", "active": false}
          ]
        },
        "description": "第3层包含数组和深层对象"
      },
      "metadata": "第1层元数据"
    }
  },
  "mixedArray": [
    "字符串元素",
    42,
    true,
    null,
    {"type": "object", "value": "内嵌对象"},
    [1, 2, [3, 4, [5, 6]]]
  ],
  "unicode": {
    "chinese": "中文测试：天地玄黄，宇宙洪荒",
    "japanese": "日本語テスト：いろはにほへと",
    "korean": "한국어 테스트：가나다라마바사",
    "emoji": "🚀🌍💡🔥✨🎯",
    "special": "àáâãäåæçèéêëìíîïðñòóôõö"
  },
  "numbers": {
    "integer": 9007199254740991,
    "negative": -273.15,
    "scientific": 6.022e23,
    "pi": 3.141592653589793,
    "zero": 0,
    "largeFloat": 1.7976931348623157e+308
  },
  "strings": {
    "empty": "",
    "multiline": "第一行\n第二行\n第三行",
    "escaped": "制表符:\t 引号:\" 反斜杠:\\",
    "longText": "这是一段较长的文本，用于测试 JSON 格式化工具在处理长字符串时的换行表现和显示效果。CodeMirror 6 编辑器提供了语法高亮、行号显示、括号匹配、代码折叠等功能，使得 JSON 数据的阅读和编辑更加便捷。"
  },
  "boolean": {
    "isEnabled": true,
    "isDeleted": false,
    "flags": {
      "feature_a": true,
      "feature_b": false,
      "feature_c": true,
      "feature_d": true,
      "feature_e": false
    }
  },
  "nullFields": {
    "optionalField": null,
    "removedAt": null,
    "placeholder": null
  }
};
