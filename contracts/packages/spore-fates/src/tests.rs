#[cfg(test)]
mod tests {
    use crate::cw721::TraitExtension;

    use std::fs::File;
    use std::io::Write;

    #[test]
    fn test_generate_all_substrates() {
        // We will generate 5 mushrooms, one for each substrate level
        for sub_level in 0..=4 {
            let mut genes = vec![];

            // Give them slightly different genes for variety
            for i in 0..8 {
                genes.push((i + sub_level as usize) as u8 % 5);
            }

            let mut traits = TraitExtension {
                cap: 0,
                stem: 0,
                spores: 0,
                substrate: sub_level, // Testing 0, 1, 2, 3, 4
                genes,
                base_cap: 0,
                base_stem: 0,
                base_spores: 0,
            };
            traits.recalculate_base_stats();

            let svg = traits.generate_svg();

            // Save file: "shroom_substrate_0.svg", etc.
            let filename = format!("shroom_substrate_{}.svg", sub_level);
            let mut file = File::create(&filename).unwrap();
            file.write_all(svg.as_bytes()).unwrap();

            println!("Generated: {}", filename);
        }
    }
}
