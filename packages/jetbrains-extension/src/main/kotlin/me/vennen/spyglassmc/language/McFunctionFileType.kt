package me.vennen.spyglassmc.language

import com.intellij.icons.AllIcons
import com.intellij.openapi.fileTypes.LanguageFileType

class McFunctionFileType : LanguageFileType(McFunctionLanguage.INSTANCE) {
    companion object {
        val INSTANCE = McFunctionFileType()
    }

    override fun getName(): String = "McFunction"

    override fun getDescription(): String = "Minecraft function file"

    override fun getDefaultExtension(): String = "mcfunction"

    override fun getIcon() = AllIcons.FileTypes.Text
}
