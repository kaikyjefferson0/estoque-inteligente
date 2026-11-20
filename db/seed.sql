DELETE FROM estoque_aula.products;
DELETE FROM estoque_aula.suppliers;

INSERT INTO estoque_aula.suppliers (id, nome, cnpj) VALUES
    (1, 'Distribuidora Central', '11222333000181'),
    (2, 'Higiene do Bairro', NULL),
    (3, 'Armazém Regional', NULL);

INSERT INTO estoque_aula.products
    (id, nome, codigo_barras, estoque_minimo, controla_validade, dias_alerta_validade, fornecedor_id)
VALUES
    (1, 'Leite integral', '7891000000001', 10, TRUE, 7, 1),
    (2, 'Iogurte natural', '7891000000002', 5, TRUE, 1, 1),
    (3, 'Detergente neutro', '7891000000003', 0, FALSE, NULL, 2),
    (4, 'Sabão em barra', '7891000000004', 8, FALSE, NULL, 2),
    (5, 'Papel-toalha', '7891000000005', 0, FALSE, NULL, NULL),
    (6, 'Farinha de trigo', '7891000000006', 3, TRUE, 15, NULL);
