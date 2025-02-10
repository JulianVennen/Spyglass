package me.vennen.spyglassmc.language

import com.intellij.lang.Language

class McFunctionLanguage : Language("mcfunction") {
    companion object {
        val INSTANCE = McFunctionLanguage()
    }
}
