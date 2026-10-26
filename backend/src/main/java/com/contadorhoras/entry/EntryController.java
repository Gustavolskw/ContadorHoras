package com.contadorhoras.entry;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.contadorhoras.common.CurrentUser;
import com.contadorhoras.entry.EntryDtos.EntryRequest;
import com.contadorhoras.entry.EntryDtos.EntryResponse;
import com.contadorhoras.entry.EntryDtos.MonthSummary;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class EntryController {

    private final EntryService service;

    public EntryController(EntryService service) {
        this.service = service;
    }

    @GetMapping("/entries")
    public List<EntryResponse> month(@RequestParam String month) {
        return service.month(CurrentUser.id(), month);
    }

    @GetMapping("/entries/{date}")
    public EntryResponse day(@PathVariable String date) {
        return service.day(CurrentUser.id(), date);
    }

    @PutMapping("/entries/{date}")
    public EntryResponse save(@PathVariable String date, @Valid @RequestBody EntryRequest req) {
        return service.save(CurrentUser.id(), date, req);
    }

    @PostMapping("/entries/plan")
    public List<EntryResponse> applyPlan(@RequestParam String month,
                                         @RequestParam(defaultValue = "false") boolean overwrite) {
        return service.applyPlan(CurrentUser.id(), month, overwrite);
    }

    @GetMapping("/summary")
    public MonthSummary summary(@RequestParam String month) {
        return service.summary(CurrentUser.id(), month);
    }
}
