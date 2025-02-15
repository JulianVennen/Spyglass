package com.spyglassmc.lsp

import com.intellij.execution.ExecutionException
import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.javascript.nodejs.interpreter.NodeCommandLineConfigurator
import com.intellij.javascript.nodejs.interpreter.NodeJsInterpreter
import com.intellij.javascript.nodejs.interpreter.NodeJsInterpreterManager
import com.intellij.javascript.nodejs.interpreter.local.NodeJsLocalInterpreter
import com.intellij.javascript.nodejs.interpreter.wsl.WslNodeInterpreter
import com.intellij.openapi.application.PluginPathManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.platform.lsp.api.ProjectWideLspServerDescriptor

@Suppress("UnstableApiUsage")
class SpyglassLspServerDescriptor(project: Project) : ProjectWideLspServerDescriptor(project, "SpyglassMC") {
    override fun isSupportedFile(file: VirtualFile): Boolean {
        if (arrayOf(
            "mcfunction",
            "mcdoc",
            "snbt",
            "mcmeta",
        ).contains(file.extension)) {
            return true
        }

        return file.extension == "json" && (hasParent(file, "data") || hasParent(file, "assets"))
    }

    private fun hasParent(file: VirtualFile, name: String): Boolean {
        var parent = file.parent

        while (parent != null) {
            if (parent.name == name) {
                return true
            }

            parent = parent.parent
        }

        return false
    }

    override val lspGoToDefinitionSupport = true
    override val lspGoToTypeDefinitionSupport = true
    override val lspHoverSupport = true

    override fun createCommandLine(): GeneralCommandLine {
        val cmdConfigurator = NodeCommandLineConfigurator.find(getInterpreter())

        return GeneralCommandLine().apply {
            withParentEnvironmentType(GeneralCommandLine.ParentEnvironmentType.CONSOLE)
            withCharset(Charsets.UTF_8)
            addParameter(getLspPath())
            addParameter("--stdio")

            cmdConfigurator.configure(this, NodeCommandLineConfigurator.defaultOptions(project))
        }
    }

    private fun getInterpreter(): NodeJsInterpreter {
        val interpreter = NodeJsInterpreterManager.getInstance(project).interpreter

        if (interpreter !is NodeJsLocalInterpreter && interpreter !is WslNodeInterpreter) {
            throw ExecutionException("Interpreter not configured")
        }

        return interpreter
    }

    private fun getLspPath(): String {
        val lsp = PluginPathManager.getPluginResource(javaClass, "language-server/server.js")

        if (lsp == null || !lsp.exists()) {
            throw ExecutionException("Language server not found")
        }

        return lsp.path
    }
}
