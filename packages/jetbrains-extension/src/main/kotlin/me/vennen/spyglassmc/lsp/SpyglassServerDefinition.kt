package me.vennen.spyglassmc.lsp

import org.eclipse.lsp4j.InitializeParams
import org.wso2.lsp4intellij.client.languageserver.serverdefinition.ProcessBuilderServerDefinition

class SpyglassServerDefinition(lspPath: String) : ProcessBuilderServerDefinition(
    "mcfunction,mcdoc,snbt,mcmeta,json",
    ProcessBuilder().command("node", /*"--inspect-brk",*/ "--no-warnings", "--experimental-default-type=module", lspPath, "--stdio")
) {
}
