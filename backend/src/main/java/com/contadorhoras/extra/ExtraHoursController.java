package com.contadorhoras.extra;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.contadorhoras.common.CurrentUser;
import com.contadorhoras.extra.ExtraHoursDtos.ExtraRequest;
import com.contadorhoras.extra.ExtraHoursDtos.ExtraResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/extras")
public class ExtraHoursController {

    private final ExtraHoursService service;

    public ExtraHoursController(ExtraHoursService service) {
        this.service = service;
    }

    @GetMapping
    public List<ExtraResponse> list(@RequestParam String month) {
        return service.list(CurrentUser.id(), month);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ExtraResponse create(@Valid @RequestBody ExtraRequest req) {
        return service.create(CurrentUser.id(), req);
    }

    @PutMapping("/{id}")
    public ExtraResponse update(@PathVariable String id, @Valid @RequestBody ExtraRequest req) {
        return service.update(CurrentUser.id(), id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        service.delete(CurrentUser.id(), id);
    }
}
