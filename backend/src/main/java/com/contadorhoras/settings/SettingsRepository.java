package com.contadorhoras.settings;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface SettingsRepository extends MongoRepository<UserSettings, String> {
}
