package me.vennen.spyglassmc.schema

import com.intellij.testFramework.fixtures.BasePlatformTestCase

class SpyglassJsonSchemaProviderFactoryTest : BasePlatformTestCase() {
    private val factory = SpyglassJsonSchemaProviderFactory()

    fun testGetProviders() {
        val providers = factory.getProviders(project)
        assertEquals(1, providers.size)
        assertTrue(providers[0] is SpyglassSchemaProvider)
    }
}
