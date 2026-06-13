# Duplicate CommissionRoad ABIs and Addresses

The Transaction Builder will copy the CommissionRoad ABIs, deployed addresses, and minimal chain configuration it needs instead of depending on the neighboring CommissionRoad workspace. This small duplication keeps the builder self-contained for development and deployment while avoiding brittle cross-repository workspace dependencies.
