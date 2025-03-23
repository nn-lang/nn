import Parser from "tree-sitter";
import language from "@nn-lang/nn-tree-sitter";

const parser = new Parser()
parser.setLanguage(language)

export {
  parser
};  
