package me.vennen.spyglassmc

import com.intellij.openapi.application.PluginPathManager
import com.intellij.testFramework.UsefulTestCase
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import java.io.File

class McMetaTextMateBundleProviderTest : BasePlatformTestCase() {
    private val bundleProvider = McMetaTextMateBundleProvider()
    private val langDir: File? = PluginPathManager.getPluginResource(bundleProvider.javaClass, "lang/")

    override fun tearDown() {
        super.tearDown()
        langDir?.deleteRecursively()
    }

    fun testGetBundles() {
        langDir!!.mkdirs()
        val bundles = bundleProvider.getBundles()
        UsefulTestCase.assertSize(1, bundles)
    }

    fun testGetBundlesNotFound() {
        langDir!!.deleteRecursively()
        val bundles = bundleProvider.getBundles()
        UsefulTestCase.assertSize(0, bundles)
    }
}
