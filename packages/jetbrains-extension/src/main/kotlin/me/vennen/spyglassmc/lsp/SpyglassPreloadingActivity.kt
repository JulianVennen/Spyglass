package me.vennen.spyglassmc.lsp

import com.intellij.execution.ExecutionException
import com.intellij.ide.ApplicationInitializedListener
import com.intellij.openapi.application.PluginPathManager
import org.wso2.lsp4intellij.IntellijLanguageClient
import org.wso2.lsp4intellij.client.languageserver.serverdefinition.RawCommandServerDefinition
import org.wso2.lsp4intellij.requests.Timeouts


@Suppress("UnstableApiUsage")
class SpyglassPreloadingActivity : ApplicationInitializedListener {
    override suspend fun execute() {
        IntellijLanguageClient.addServerDefinition(
            SpyglassServerDefinition(getLspPath())
        )

        val timeouts = IntellijLanguageClient.getTimeouts()
        timeouts[Timeouts.INIT] = 100_000
        timeouts[Timeouts.SHUTDOWN] = 10_000
    }

    private fun getLspPath(): String {
        val lsp = PluginPathManager.getPluginResource(javaClass, "language-server/server.js")

        if (lsp == null || !lsp.exists()) {
            throw ExecutionException("Language server not found")
        }

        return lsp.path
    }
}
