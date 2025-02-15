package com.spyglassmc.lsp

import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.platform.lsp.api.LspServerSupportProvider

@Suppress("UnstableApiUsage")
class SpyglassLspServerSupportProvider : LspServerSupportProvider {
    override fun fileOpened(
        project: Project,
        file: VirtualFile,
        serverStarter: LspServerSupportProvider.LspServerStarter
    ) {
        val descriptor = SpyglassLspServerDescriptor(project);
        if (descriptor.isSupportedFile(file)) {
            serverStarter.ensureServerStarted(descriptor)
        }
    }
}
