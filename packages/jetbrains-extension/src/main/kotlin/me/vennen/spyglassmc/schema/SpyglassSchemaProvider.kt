package me.vennen.spyglassmc.schema

import com.intellij.openapi.application.PluginPathManager
import com.intellij.openapi.vfs.StandardFileSystems
import com.intellij.openapi.vfs.VirtualFile
import com.jetbrains.jsonSchema.extension.JsonSchemaFileProvider
import com.jetbrains.jsonSchema.extension.SchemaType

class SpyglassSchemaProvider : JsonSchemaFileProvider {
    override fun isAvailable(file: VirtualFile): Boolean = arrayOf("spyglass.json", ".spyglassrc.json").contains(file.name)

    override fun getName(): String = "Spyglass configuration file"

    override fun getSchemaFile(): VirtualFile? {
        val file = PluginPathManager.getPluginResource(javaClass, "lang/resource/spyglass.json")
        if (file == null || !file.exists()) {
            return null
        }

        return StandardFileSystems.local().findFileByPath(file.path)
    }

    override fun getSchemaType(): SchemaType = SchemaType.embeddedSchema
}
