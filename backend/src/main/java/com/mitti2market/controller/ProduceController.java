package com.mitti2market.controller;

import com.mitti2market.model.Produce;
import com.mitti2market.repository.ProduceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/produce")
@RequiredArgsConstructor
public class ProduceController {

    private final ProduceRepository produceRepository;

    @GetMapping
    public ResponseEntity<List<Produce>> getAllProduce() {
        return ResponseEntity.ok(produceRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Produce> getProduceById(@PathVariable Long id) {
        return produceRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Produce> createProduce(@RequestBody Produce produce) {
        Produce saved = produceRepository.save(produce);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Produce> updateProduce(@PathVariable Long id, @RequestBody Produce updated) {
        return produceRepository.findById(id).map(produce -> {
            produce.setName(updated.getName());
            produce.setQuantity(updated.getQuantity());
            produce.setPricePerKg(updated.getPricePerKg());
            produce.setStatus(updated.getStatus());
            produce.setGrade(updated.getGrade());
            produce.setDescription(updated.getDescription());
            return ResponseEntity.ok(produceRepository.save(produce));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduce(@PathVariable Long id) {
        produceRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
