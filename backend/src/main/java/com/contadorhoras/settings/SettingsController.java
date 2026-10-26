package com.contadorhoras.settings;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.contadorhoras.common.CurrentUser;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingsService service;

    public SettingsController(SettingsService service) {
        this.service = service;
    }

    @GetMapping
    public UserSettings get() {
        return service.get(CurrentUser.id());
    }

    @PutMapping
    public UserSettings update(@Valid @RequestBody SettingsRequest req) {
        return service.update(CurrentUser.id(), req);
    }
}
