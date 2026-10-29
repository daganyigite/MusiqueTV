plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.rodrigue.musiquetv"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.rodrigue.musiquetv"
        minSdk = 23
        targetSdk = 34
        versionCode = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()
        versionName = "1.0." + (System.getenv("GITHUB_RUN_NUMBER") ?: "0")
    }

    // Clé de signature fixe : chaque nouvelle version s'installe par-dessus l'ancienne.
    signingConfigs {
        create("perso") {
            storeFile = file("musiquetv.keystore")
            storePassword = "musiquetv"
            keyAlias = "musiquetv"
            keyPassword = "musiquetv"
        }
    }

    buildTypes {
        getByName("debug") {
            signingConfig = signingConfigs.getByName("perso")
        }
        getByName("release") {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("perso")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    // Projet perso : on ne bloque pas la compilation sur des avertissements.
    lint {
        abortOnError = false
        checkReleaseBuilds = false
    }
}
