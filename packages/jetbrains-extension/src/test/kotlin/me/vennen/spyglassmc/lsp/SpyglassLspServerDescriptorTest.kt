package me.vennen.spyglassmc.lsp

import com.intellij.execution.ExecutionException
import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.openapi.application.PluginPathManager
import com.intellij.testFramework.UsefulTestCase
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import java.io.File

class SpyglassLspServerDescriptorTest : BasePlatformTestCase() {
    private lateinit var descriptor: SpyglassLspServerDescriptor
    private var languageServerFile: File? = null

    override fun setUp() {
        super.setUp()

        descriptor = SpyglassLspServerDescriptor(project)
        languageServerFile = PluginPathManager.getPluginResource(descriptor.javaClass, "language-server/server.js")
        languageServerFile?.parentFile?.mkdirs()
        languageServerFile?.writeText("")
    }

    override fun tearDown() {
        super.tearDown()

        languageServerFile?.delete()
    }

    fun testIsSupportedFile() {
        listOf(
            FileTestData("test.mcfunction", true),
            FileTestData("test.txt", false),
            FileTestData("test.mcdoc", true),
            FileTestData("test.snbt", true),
            FileTestData("test.mcmeta", true),
            FileTestData("data/test.json", true),
            FileTestData("assets/test.json", true),
            FileTestData("other/test.json", false),
        ).forEach {
            val file = myFixture.addFileToProject(it.path, "")
            if (it.expected) {
                assertTrue("Expected file '${it.path}' to be supported", descriptor.isSupportedFile(file.virtualFile))
            } else {
                assertFalse("Expected file '${it.path}' to be unsupported", descriptor.isSupportedFile(file.virtualFile))
            }
        }
    }

    fun testCreateCommandLine() {
        val cmd = descriptor.createCommandLine()
        assertEquals(GeneralCommandLine.ParentEnvironmentType.CONSOLE, cmd.parentEnvironmentType)
        assertEquals(Charsets.UTF_8, cmd.charset)
        assertTrue(cmd.parametersList.hasParameter("--stdio"))
    }

    fun testMissingLanguageServer() {
        languageServerFile?.delete()
        UsefulTestCase.assertThrows(ExecutionException::class.java, "Language server not found") {
            descriptor.createCommandLine()
        }
    }
}

private class FileTestData(val path: String, val expected: Boolean)
