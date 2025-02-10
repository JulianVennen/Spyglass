package me.vennen.spyglassmc.schema

import com.intellij.openapi.application.PluginPathManager
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import com.jetbrains.jsonSchema.extension.SchemaType
import java.io.File

class SpyglassSchemaProviderTest : BasePlatformTestCase() {
    private val provider = SpyglassSchemaProvider()
    private val resourceDir: File? = PluginPathManager.getPluginResource(provider.javaClass, "lang/resource")

    override fun setUp() {
        super.setUp()
        resourceDir!!.mkdirs()
    }

    override fun tearDown() {
        super.tearDown()
        resourceDir!!.parentFile.deleteRecursively()
    }

    fun testIsAvailable() {
        assertTrue(provider.isAvailable(myFixture.configureByText("spyglass.json", "{}").virtualFile))
        assertTrue(provider.isAvailable(myFixture.configureByText(".spyglassrc.json", "{}").virtualFile))
        assertFalse(provider.isAvailable(myFixture.configureByText("spyglassrc.json", "{}").virtualFile))
    }

    fun testGetName() {
        assertEquals("Spyglass configuration file", provider.name)
    }

    fun testGetSchemaFile() {
        resourceDir!!.mkdirs()
        resourceDir.resolve("spyglass.json").writeText("{}")

        val file = provider.schemaFile
        assertNotNull(file)
        assertEquals("spyglass.json", file!!.name)
    }

    fun testGetSchemaFileNotFound() {
        val file = provider.schemaFile
        assertNull(file)
    }

    fun testGetSchemaType() {
        assertEquals(SchemaType.embeddedSchema, provider.schemaType)
    }
}
