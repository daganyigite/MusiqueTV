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

    // Clé de signature : chaque nouvelle version s'installe par-dessus l'ancienne.
    // Si une clé privée est configurée dans les secrets GitHub, c'est elle qui est utilisée
    // (personne d'autre ne peut alors fabriquer une fausse mise à jour de l'app).
    signingConfigs {
        create("perso") {
            val privateStore = System.getenv("SIGNING_STORE_FILE")
            if (privateStore != null && file(privateStore).exists()) {
                storeFile = file(privateStore)
                storePassword = System.getenv("SIGNING_STORE_PASSWORD")
                keyAlias = System.getenv("SIGNING_KEY_ALIAS") ?: "musiquetv"
                keyPassword = System.getenv("SIGNING_STORE_PASSWORD")
            } else {
                storeFile = file("musiquetv.keystore")
                storePassword = "musiquetv"
                keyAlias = "musiquetv"
                keyPassword = "musiquetv"
            }
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
