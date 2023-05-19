import { makeParseRuleModule } from "infinite-lang/rule/parser";

export default makeParseRuleModule({ role: "expression", nodeType: "functionCall", priority: 1 }, [
    {
        role: "identifier",
        condition: () => true,
        key: "identifier"
    },
    {
        role: "expressionList",
        condition: () => true,
        key: "params"
    }
] as const);